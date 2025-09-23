#!/usr/bin/env python3
"""
批量修复backend模块的导入路径
"""
import os
import re
from pathlib import Path

def fix_imports(file_path):
    """修复单个文件的导入"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 需要修复的导入模式
    patterns = [
        (r'^from config\.', 'from backend.config.'),
        (r'^from core\.', 'from backend.core.'),
        (r'^from models\.', 'from backend.models.'),
        (r'^from models import', 'from backend.models import'),
        (r'^from services\.', 'from backend.services.'),
        (r'^from schemas\.', 'from backend.schemas.'),
        (r'^from api\.', 'from backend.api.'),
        (r'^import config\.', 'import backend.config.'),
        (r'^import core\.', 'import backend.core.'),
        (r'^import models\.', 'import backend.models.'),
        (r'^import services\.', 'import backend.services.'),
        (r'^import schemas\.', 'import backend.schemas.'),
        (r'^import api\.', 'import backend.api.'),
    ]

    lines = content.split('\n')
    modified = False

    for i, line in enumerate(lines):
        for pattern, replacement in patterns:
            if re.match(pattern, line):
                new_line = re.sub(pattern, replacement, line)
                if new_line != line:
                    lines[i] = new_line
                    modified = True
                    print(f"  Fixed: {line} -> {new_line}")
                break

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        return True
    return False

def main():
    backend_dir = Path(__file__).parent

    # 跳过的文件
    skip_files = {'__pycache__', '.pyc', 'fix_imports.py', '__init__.py'}

    fixed_count = 0
    for root, dirs, files in os.walk(backend_dir):
        # 跳过__pycache__目录
        dirs[:] = [d for d in dirs if d != '__pycache__']

        for file in files:
            if file.endswith('.py') and file not in skip_files:
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, backend_dir)

                # 跳过tests目录
                if 'tests' in relative_path:
                    continue

                print(f"Checking {relative_path}...")
                if fix_imports(file_path):
                    fixed_count += 1

    print(f"\nFixed {fixed_count} files")

if __name__ == '__main__':
    main()
