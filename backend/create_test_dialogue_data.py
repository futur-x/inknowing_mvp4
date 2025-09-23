"""
Create test dialogue data for testing dialogue functionality
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta
from uuid import uuid4
import random
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config.database import engine, get_db
from backend.models.user import User
from backend.models.book import Book
from backend.models.dialogue import (
    DialogueSession,
    DialogueMessage,
    DialogueContext,
    DialogueType,
    DialogueStatus,
    MessageRole
)
from backend.core.logger import logger


# Sample dialogue data for different scenarios
DIALOGUE_SCENARIOS = {
    "红楼梦": [
        {
            "user": "请给我介绍一下贾宝玉的性格特点",
            "assistant": "贾宝玉是《红楼梦》的主人公，他的性格十分复杂而独特：\n\n1. **叛逆精神**：宝玉厌恶功名利禄，反对封建礼教的束缚，常说'女儿是水做的骨肉，男人是泥做的骨肉'。\n\n2. **重情重义**：对待感情真挚专一，对林黛玉情有独钟，对所有女孩子都怀有同情和尊重。\n\n3. **天真率性**：保持着孩子般的纯真，喜欢与女孩子们一起玩耍，不喜欢与俗世男子交往。\n\n4. **才华横溢**：虽不喜八股文章，但诗才敏捷，常能即兴作出佳句。\n\n5. **善良温柔**：对待下人从不苛刻，体贴入微，具有悲悯之心。",
            "tokens": {"user": 15, "assistant": 245}
        },
        {
            "user": "林黛玉和薛宝钗有什么不同？",
            "assistant": "林黛玉和薛宝钗是《红楼梦》中两位重要的女主角，她们性格迥异：\n\n**林黛玉**：\n- 性格：敏感多愁，才思敏捷，孤高自许\n- 出身：书香门第，父母早亡，寄人篱下\n- 才华：诗才最高，文学修养深厚\n- 爱情观：追求真情，不容许任何虚伪\n- 处世：不善交际，常有小性儿\n\n**薛宝钗**：\n- 性格：端庄稳重，识大体，懂世故\n- 出身：皇商之家，家境富裕\n- 才华：博学多才，诗词、医药皆通\n- 爱情观：遵从父母之命，媒妁之言\n- 处世：圆滑周到，人缘极好\n\n二人代表了两种不同的女性形象和价值观。",
            "tokens": {"user": 18, "assistant": 267}
        },
        {
            "user": "大观园是什么地方？",
            "assistant": "大观园是《红楼梦》中一个极其重要的场所，是贾府为元妃省亲而特意修建的园林：\n\n**建造背景**：\n贾元春被封为贤德妃，皇帝恩准妃嫔回家省亲，贾府耗费巨资修建了这座园林。\n\n**园林特色**：\n1. 规模宏大，亭台楼阁，曲径通幽\n2. 每处景观都有诗意的名字：潇湘馆、怡红院、蘅芜苑等\n3. 融合了江南园林的精致与北方建筑的大气\n\n**居住安排**：\n- 林黛玉住潇湘馆（竹影婆娑）\n- 贾宝玉住怡红院（海棠花开）\n- 薛宝钗住蘅芜苑（清雅素净）\n- 探春住秋爽斋\n- 迎春住紫菱洲\n\n大观园是青春理想国的象征，也见证了贾府由盛转衰的历程。",
            "tokens": {"user": 12, "assistant": 289}
        }
    ],
    "西游记": [
        {
            "user": "孙悟空有哪些本领？",
            "assistant": "孙悟空作为《西游记》的主角，拥有诸多神通本领：\n\n**主要法术**：\n1. **七十二变**：可变化成各种人物、动物、植物甚至物品\n2. **筋斗云**：一个筋斗十万八千里\n3. **火眼金睛**：能识破妖怪的伪装变化\n4. **身外身法**：拔毫毛可变出无数分身\n\n**武器法宝**：\n- 如意金箍棒：重一万三千五百斤，可大可小\n- 从龙宫获得的战甲装备\n\n**其他本领**：\n- 长生不老（吃了蟠桃、仙丹）\n- 刀枪不入（太上老君炼丹炉炼就）\n- 善于水性，可在水下自由活动\n- 力大无穷，能担山超海\n\n这些本领使他成为保护唐僧西天取经的得力助手。",
            "tokens": {"user": 14, "assistant": 276}
        },
        {
            "user": "为什么要去西天取经？",
            "assistant": "西天取经的原因涉及多个层面：\n\n**表面原因**：\n唐太宗李世民因地府之行，答应超度亡魂，需要真经来普度众生。观音菩萨点化，说东土大唐的经书不全，需要去西天大雷音寺求取真经。\n\n**深层意义**：\n1. **佛教东传**：历史上玄奘西行求法的艺术化再现\n2. **修行历练**：八十一难代表修行路上的种种考验\n3. **因果报应**：\n   - 唐僧是金蝉子转世，需历劫难\n   - 悟空因大闹天宫需赎罪\n   - 八戒、沙僧也都因犯天条需要赎罪\n\n**最终目的**：\n取回三藏真经（共35部，15144卷），传播佛法，普度众生，同时取经团队成员也都修成正果，各有封赏。\n\n这既是一个宗教故事，也蕴含着人生修行的深刻寓意。",
            "tokens": {"user": 13, "assistant": 312}
        }
    ],
    "三体": [
        {
            "user": "什么是黑暗森林法则？",
            "assistant": "黑暗森林法则是《三体》第二部的核心概念，由罗辑悟出的宇宙社会学基本法则：\n\n**基本公理**：\n1. 生存是文明的第一需要\n2. 文明不断增长和扩张，但宇宙中的物质总量保持不变\n\n**推论链条**：\n- 猜疑链：不同文明之间无法判断对方是否为善意\n- 技术爆炸：文明的技术发展可能随时爆发式增长\n\n**核心结论**：\n宇宙就是一座黑暗森林，每个文明都是带枪的猎人，必须小心翼翼地隐藏自己。一旦某个文明的位置被暴露，就会遭到其他文明的打击。\n\n**实际应用**：\n罗辑通过建立黑暗森林威慑，公布三体世界的坐标来威胁三体文明，从而达到战略平衡。\n\n这个理论深刻而残酷地揭示了宇宙文明间的生存法则。",
            "tokens": {"user": 15, "assistant": 298}
        },
        {
            "user": "三体人为什么要入侵地球？",
            "assistant": "三体人入侵地球有着深刻的生存必要性：\n\n**根本原因 - 恶劣的生存环境**：\n1. **三体星系的混乱**：三颗恒星无规律运动，导致文明反复毁灭重建\n2. **恒纪元与乱纪元**：极端的环境变化，生存条件极其恶劣\n3. **文明的脆弱性**：已经历200多次毁灭与重生\n\n**直接动机**：\n- 收到叶文洁的回复信号，确定了地球的位置\n- 地球环境稳定，只有一颗恒星，是理想的移民目标\n- 三体世界随时可能彻底毁灭，必须寻找新家园\n\n**技术优势**：\n- 科技水平远超地球\n- 通过智子锁死地球基础科学\n- 舰队虽需400年才能到达，但可以等待\n\n**文化因素**：\n- 三体人思维透明，认为地球人的欺骗能力是威胁\n- 将地球人视为虫子，需要清除\n\n这是一场关乎种族存亡的宇宙战争。",
            "tokens": {"user": 16, "assistant": 345}
        }
    ]
}


async def create_test_dialogues(db: AsyncSession):
    """Create test dialogue sessions with realistic data"""

    # Get test user
    stmt = select(User).where(User.username == "testuser")
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        logger.warning("Test user not found. Please run create_test_user.py first")
        return

    logger.info(f"Creating dialogue data for user: {user.username}")

    # Get books
    stmt = select(Book).limit(10)
    result = await db.execute(stmt)
    books = result.scalars().all()

    if not books:
        logger.warning("No books found. Please run create_test_books.py first")
        return

    created_sessions = []

    for book in books[:3]:  # Create dialogues for first 3 books
        # Find matching dialogue scenario
        scenario_key = None
        for key in DIALOGUE_SCENARIOS.keys():
            if key in book.title:
                scenario_key = key
                break

        if not scenario_key:
            # Use a random scenario if no match
            scenario_key = random.choice(list(DIALOGUE_SCENARIOS.keys()))

        scenarios = DIALOGUE_SCENARIOS[scenario_key]

        # Create dialogue session
        session = DialogueSession(
            user_id=user.id,
            book_id=book.id,
            type="book",
            status="active",
            initial_question=scenarios[0]["user"],
            message_count=0,
            total_input_tokens=0,
            total_output_tokens=0,
            created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 72)),
            last_message_at=datetime.utcnow() - timedelta(minutes=random.randint(5, 120))
        )

        db.add(session)
        await db.flush()  # Get session ID

        created_sessions.append({
            "session": session,
            "book": book
        })

        # Add messages from scenarios
        message_time = session.created_at
        for i, scenario in enumerate(scenarios):
            # User message
            user_msg = DialogueMessage(
                session_id=session.id,
                message_id=str(uuid4()),
                role="user",
                content=scenario["user"],
                tokens_used=scenario["tokens"]["user"],
                model_used="user",
                created_at=message_time
            )
            db.add(user_msg)
            message_time += timedelta(seconds=random.randint(2, 5))

            # Assistant message
            assistant_msg = DialogueMessage(
                session_id=session.id,
                message_id=str(uuid4()),
                role="assistant",
                content=scenario["assistant"],
                tokens_used=scenario["tokens"]["assistant"],
                model_used="gpt-3.5-turbo",
                response_time_ms=random.randint(800, 2000),
                created_at=message_time
            )
            db.add(assistant_msg)
            message_time += timedelta(seconds=random.randint(30, 180))

            # Update session stats
            session.message_count += 2
            session.total_input_tokens += scenario["tokens"]["user"]
            session.total_output_tokens += scenario["tokens"]["assistant"]
            session.last_message_at = message_time

        # Create dialogue context
        context = DialogueContext(
            session_id=session.id,
            context_messages=[
                {"role": "system", "content": f"你是一个关于《{book.title}》的专业助手"},
                {"role": "assistant", "content": "我已经准备好回答您关于这本书的问题了。"}
            ],
            context_tokens=session.total_input_tokens + session.total_output_tokens,
            key_topics=[book.title, book.author],
            key_entities={"book": book.title, "author": book.author}
        )
        db.add(context)

    # Create some completed sessions
    for i in range(2):
        book = random.choice(books)
        old_session = DialogueSession(
            user_id=user.id,
            book_id=book.id,
            type="book",
            status="ended",
            initial_question="这本书主要讲了什么？",
            message_count=6,
            total_input_tokens=120,
            total_output_tokens=850,
            created_at=datetime.utcnow() - timedelta(days=random.randint(5, 30)),
            last_message_at=datetime.utcnow() - timedelta(days=random.randint(1, 5)),
            ended_at=datetime.utcnow() - timedelta(days=random.randint(1, 5))
        )
        db.add(old_session)
        created_sessions.append({
            "session": old_session,
            "book": book
        })

    await db.commit()

    # Print summary
    logger.info(f"\n{'='*60}")
    logger.info("Test Dialogue Data Created Successfully!")
    logger.info(f"{'='*60}")
    for item in created_sessions:
        session = item["session"]
        book = item["book"]
        logger.info(f"Session ID: {session.id}")
        logger.info(f"  Book: {book.title}")
        logger.info(f"  Status: {session.status}")
        logger.info(f"  Messages: {session.message_count}")
        logger.info(f"  Tokens: {session.total_input_tokens + session.total_output_tokens}")
        logger.info(f"  Created: {session.created_at}")
        logger.info("-" * 40)

    return created_sessions


async def clear_existing_dialogues(db: AsyncSession):
    """Clear existing dialogue data"""
    logger.info("Clearing existing dialogue data...")

    # Delete in correct order due to foreign keys
    await db.execute(text("DELETE FROM dialogue_contexts"))
    await db.execute(text("DELETE FROM dialogue_messages"))
    await db.execute(text("DELETE FROM dialogue_sessions"))
    await db.commit()

    logger.info("Existing dialogue data cleared")


async def main():
    """Main function"""
    logger.info("Starting dialogue test data creation...")

    async with engine.begin() as conn:
        # Create tables if not exist
        from config.database import Base
        await conn.run_sync(Base.metadata.create_all)

    async for db in get_db():
        try:
            # Optionally clear existing data
            response = input("Clear existing dialogue data? (y/n): ")
            if response.lower() == 'y':
                await clear_existing_dialogues(db)

            # Create test dialogues
            await create_test_dialogues(db)

            logger.info("\nTest dialogue data creation completed!")

        except Exception as e:
            logger.error(f"Error creating test data: {e}")
            await db.rollback()
            raise
        finally:
            await db.close()


if __name__ == "__main__":
    asyncio.run(main())