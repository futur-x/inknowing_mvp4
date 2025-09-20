from app.db.session import SessionLocal
from app.models.user import User

db = SessionLocal()
users = db.query(User).all()
print(f"Total users: {len(users)}")
for u in users:
    print(f'User: {u.phone}, ID: {u.id}, Username: {u.username}')
db.close()