"""
工具函数模块 - 文件处理、文本提取
"""

import os
import secrets


def generate_random_filename(original_filename: str) -> str:
    """生成随机文件名"""
    random_str = secrets.token_hex(8)
    # 提取文件扩展名
    if "." in original_filename:
        ext = original_filename.rsplit(".", 1)[1]
        return f"{random_str}.{ext}"
    return random_str


def extract_text_from_pdf(file_path: str) -> str:
    """从 PDF 文件提取文本"""
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except Exception as e:
        print(f"PDF 提取错误: {e}")
        return ""


def extract_text_from_docx(file_path: str) -> str:
    """从 DOCX 文件提取文本"""
    try:
        from docx import Document
        doc = Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text.strip()
    except Exception as e:
        print(f"DOCX 提取错误: {e}")
        return ""


def extract_text_from_txt(file_path: str) -> str:
    """从 TXT 文件提取文本"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except UnicodeDecodeError:
        # 尝试其他编码
        with open(file_path, "r", encoding="gbk") as f:
            return f.read().strip()
    except Exception as e:
        print(f"TXT 提取错误: {e}")
        return ""


def extract_text_from_file(file_path: str, file_type: str) -> str:
    """根据文件类型提取文本"""
    if file_type == "application/pdf" or file_path.lower().endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    elif file_type in ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] or \
         file_path.lower().endswith((".doc", ".docx")):
        return extract_text_from_docx(file_path)
    elif file_type == "text/plain" or file_path.lower().endswith(".txt"):
        return extract_text_from_txt(file_path)
    return ""


def get_file_extension(content_type: str) -> str:
    """根据 Content-Type 获取文件扩展名"""
    mapping = {
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "text/plain": "txt",
    }
    return mapping.get(content_type, "")
