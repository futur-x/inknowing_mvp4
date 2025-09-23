"""
Vector Database Service - ChromaDB integration for RAG
"""
import os
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime

import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from backend.models.book import Book, BookChapter
from backend.schemas.ai_model import (
    VectorSearchQuery,
    VectorSearchResult,
    VectorIndexStatus,
)
from backend.services.ai_model import ai_service
from backend.core.logger import logger


class VectorDBService:
    """Vector database service using ChromaDB"""

    def __init__(self):
        self.client = None
        self.collections = {}
        self.embedding_function = None

    async def initialize(self):
        """Initialize ChromaDB client and collections"""
        try:
            # Initialize ChromaDB client
            persist_directory = os.getenv("CHROMADB_PATH", "./chroma_db")

            self.client = chromadb.PersistentClient(
                path=persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=False
                )
            )

            # Initialize embedding function
            await self._initialize_embeddings()

            logger.info(f"ChromaDB initialized at {persist_directory}")

        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            raise

    async def _initialize_embeddings(self):
        """Initialize embedding function"""
        try:
            # Try to use OpenAI embeddings if available
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if openai_api_key:
                self.embedding_function = embedding_functions.OpenAIEmbeddingFunction(
                    api_key=openai_api_key,
                    model_name="text-embedding-3-small"
                )
            else:
                # Fallback to default embeddings
                self.embedding_function = embedding_functions.DefaultEmbeddingFunction()

        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI embeddings, using default: {e}")
            self.embedding_function = embedding_functions.DefaultEmbeddingFunction()

    def _get_collection_name(self, book_id: str) -> str:
        """Generate collection name for a book"""
        # Use hash to ensure valid collection name
        return f"book_{hashlib.md5(book_id.encode()).hexdigest()[:16]}"

    async def create_book_collection(
        self,
        book_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a collection for a book"""
        try:
            collection_name = self._get_collection_name(book_id)

            # Check if collection already exists
            existing_collections = self.client.list_collections()
            if any(c.name == collection_name for c in existing_collections):
                # Delete existing collection
                self.client.delete_collection(collection_name)

            # Create new collection
            collection = self.client.create_collection(
                name=collection_name,
                embedding_function=self.embedding_function,
                metadata=metadata or {"book_id": book_id}
            )

            self.collections[book_id] = collection

            logger.info(f"Created collection for book {book_id}")
            return collection_name

        except Exception as e:
            logger.error(f"Failed to create book collection: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create vector collection: {str(e)}"
            )

    async def index_book_content(
        self,
        book_id: str,
        chapters: List[BookChapter],
        chunk_size: int = 500,
        chunk_overlap: int = 50
    ) -> int:
        """Index book content into vector database"""
        try:
            # Get or create collection
            if book_id not in self.collections:
                collection_name = self._get_collection_name(book_id)
                try:
                    self.collections[book_id] = self.client.get_collection(
                        name=collection_name,
                        embedding_function=self.embedding_function
                    )
                except:
                    await self.create_book_collection(book_id)

            collection = self.collections[book_id]

            # Process chapters and create chunks
            documents = []
            metadatas = []
            ids = []

            for chapter in chapters:
                # Split chapter content into chunks
                chunks = self._create_chunks(
                    chapter.content,
                    chunk_size,
                    chunk_overlap
                )

                for i, chunk in enumerate(chunks):
                    doc_id = f"{book_id}_{chapter.chapter_number}_{i}"

                    documents.append(chunk)
                    metadatas.append({
                        "book_id": book_id,
                        "chapter_number": chapter.chapter_number,
                        "chapter_title": chapter.title,
                        "chunk_index": i,
                        "chunk_size": len(chunk)
                    })
                    ids.append(doc_id)

            # Add documents to collection in batches
            batch_size = 100
            total_indexed = 0

            for i in range(0, len(documents), batch_size):
                batch_docs = documents[i:i + batch_size]
                batch_metas = metadatas[i:i + batch_size]
                batch_ids = ids[i:i + batch_size]

                collection.add(
                    documents=batch_docs,
                    metadatas=batch_metas,
                    ids=batch_ids
                )

                total_indexed += len(batch_docs)
                logger.info(f"Indexed {total_indexed}/{len(documents)} chunks for book {book_id}")

            logger.info(f"Successfully indexed {total_indexed} chunks for book {book_id}")
            return total_indexed

        except Exception as e:
            logger.error(f"Failed to index book content: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to index book content: {str(e)}"
            )

    def _create_chunks(
        self,
        text: str,
        chunk_size: int,
        overlap: int
    ) -> List[str]:
        """Split text into overlapping chunks"""
        chunks = []
        words = text.split()

        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)

        return chunks

    async def search(
        self,
        query: VectorSearchQuery,
        user_embedding: Optional[List[float]] = None
    ) -> List[VectorSearchResult]:
        """Search for similar content in vector database"""
        try:
            # Get collection
            if query.book_id:
                if query.book_id not in self.collections:
                    collection_name = self._get_collection_name(query.book_id)
                    try:
                        self.collections[query.book_id] = self.client.get_collection(
                            name=collection_name,
                            embedding_function=self.embedding_function
                        )
                    except:
                        return []  # Collection doesn't exist

                collection = self.collections[query.book_id]
            else:
                # Search across all collections
                return await self._search_all_collections(query, user_embedding)

            # Perform search
            if user_embedding:
                results = collection.query(
                    query_embeddings=[user_embedding],
                    n_results=query.top_k,
                    where=query.metadata_filter
                )
            else:
                results = collection.query(
                    query_texts=[query.query],
                    n_results=query.top_k,
                    where=query.metadata_filter
                )

            # Convert to response format
            search_results = []
            for i, doc in enumerate(results["documents"][0]):
                metadata = results["metadatas"][0][i]
                distance = results["distances"][0][i]

                # Convert distance to similarity score (0-1)
                score = max(0, 1 - distance)

                if score >= query.threshold:
                    search_results.append(VectorSearchResult(
                        id=results["ids"][0][i],
                        content=doc,
                        metadata=metadata,
                        score=score,
                        source=f"Chapter {metadata.get('chapter_number', 'Unknown')}: {metadata.get('chapter_title', '')}"
                    ))

            return search_results

        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Vector search failed: {str(e)}"
            )

    async def _search_all_collections(
        self,
        query: VectorSearchQuery,
        user_embedding: Optional[List[float]] = None
    ) -> List[VectorSearchResult]:
        """Search across all book collections"""
        all_results = []

        try:
            collections = self.client.list_collections()

            for collection_info in collections:
                if collection_info.name.startswith("book_"):
                    collection = self.client.get_collection(
                        name=collection_info.name,
                        embedding_function=self.embedding_function
                    )

                    if user_embedding:
                        results = collection.query(
                            query_embeddings=[user_embedding],
                            n_results=query.top_k,
                            where=query.metadata_filter
                        )
                    else:
                        results = collection.query(
                            query_texts=[query.query],
                            n_results=query.top_k,
                            where=query.metadata_filter
                        )

                    # Add results from this collection
                    for i, doc in enumerate(results["documents"][0]):
                        metadata = results["metadatas"][0][i]
                        distance = results["distances"][0][i]
                        score = max(0, 1 - distance)

                        if score >= query.threshold:
                            all_results.append({
                                "result": VectorSearchResult(
                                    id=results["ids"][0][i],
                                    content=doc,
                                    metadata=metadata,
                                    score=score,
                                    source=f"Book {metadata.get('book_id', 'Unknown')}, Chapter {metadata.get('chapter_number', 'Unknown')}"
                                ),
                                "score": score
                            })

            # Sort by score and return top k
            all_results.sort(key=lambda x: x["score"], reverse=True)
            return [r["result"] for r in all_results[:query.top_k]]

        except Exception as e:
            logger.error(f"Failed to search all collections: {e}")
            return []

    async def delete_book_collection(self, book_id: str):
        """Delete a book's vector collection"""
        try:
            collection_name = self._get_collection_name(book_id)
            self.client.delete_collection(collection_name)

            if book_id in self.collections:
                del self.collections[book_id]

            logger.info(f"Deleted collection for book {book_id}")

        except Exception as e:
            logger.error(f"Failed to delete book collection: {e}")

    async def get_collection_stats(self, book_id: str) -> Dict[str, Any]:
        """Get statistics for a book's vector collection"""
        try:
            collection_name = self._get_collection_name(book_id)

            if book_id not in self.collections:
                try:
                    self.collections[book_id] = self.client.get_collection(
                        name=collection_name,
                        embedding_function=self.embedding_function
                    )
                except:
                    return {
                        "exists": False,
                        "count": 0
                    }

            collection = self.collections[book_id]
            count = collection.count()

            return {
                "exists": True,
                "count": count,
                "name": collection_name,
                "metadata": collection.metadata
            }

        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {
                "exists": False,
                "count": 0,
                "error": str(e)
            }

    async def update_chunk(
        self,
        book_id: str,
        chunk_id: str,
        new_content: str,
        new_metadata: Optional[Dict[str, Any]] = None
    ):
        """Update a specific chunk in the vector database"""
        try:
            if book_id not in self.collections:
                collection_name = self._get_collection_name(book_id)
                self.collections[book_id] = self.client.get_collection(
                    name=collection_name,
                    embedding_function=self.embedding_function
                )

            collection = self.collections[book_id]

            # Update the chunk
            collection.update(
                ids=[chunk_id],
                documents=[new_content],
                metadatas=[new_metadata] if new_metadata else None
            )

            logger.info(f"Updated chunk {chunk_id} in book {book_id}")

        except Exception as e:
            logger.error(f"Failed to update chunk: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update chunk: {str(e)}"
            )

    async def batch_embed_texts(
        self,
        texts: List[str]
    ) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        try:
            if self.embedding_function:
                return self.embedding_function(texts)
            else:
                # Use AI service as fallback
                embeddings = []
                for text in texts:
                    embedding = await ai_service.embedding(text)
                    embeddings.append(embedding)
                return embeddings

        except Exception as e:
            logger.error(f"Failed to generate embeddings: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate embeddings: {str(e)}"
            )


# Global instance
vector_service = VectorDBService()