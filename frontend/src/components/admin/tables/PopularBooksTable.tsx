"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Star } from 'lucide-react';

interface PopularBook {
  id: string;
  title: string;
  author: string;
  dialogue_count: number;
  rating: number;
}

interface PopularBooksTableProps {
  books: PopularBook[];
  className?: string;
}

const PopularBooksTable: React.FC<PopularBooksTableProps> = ({ books, className = "" }) => {
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="text-sm">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>热门书籍排行</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">排名</TableHead>
              <TableHead>书名</TableHead>
              <TableHead>作者</TableHead>
              <TableHead>对话数</TableHead>
              <TableHead>评分</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {books.map((book, index) => (
              <TableRow key={book.id}>
                <TableCell className="font-medium">
                  {index + 1}
                </TableCell>
                <TableCell className="font-medium">{book.title}</TableCell>
                <TableCell>{book.author}</TableCell>
                <TableCell>{book.dialogue_count}</TableCell>
                <TableCell>{renderRating(book.rating)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PopularBooksTable;