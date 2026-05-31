"""
SimHash文本去重模块 - 用于检测和过滤重复的面试题
原理: 将文本映射为64位指纹，汉明距离<=3视为重复
"""

import hashlib
import re
from typing import List, Set


class SimHash:
    """SimHash实现 - 局部敏感哈希"""
    
    def __init__(self, hashbits: int = 64):
        self.hashbits = hashbits
    
    def _tokenize(self, text: str) -> List[str]:
        """分词 - 简单按字符bigram（两字一组）"""
        text = re.sub(r"\s+", "", text.lower())
        # 过滤掉过短的文本
        if len(text) < 2:
            return []
        return [text[i:i+2] for i in range(len(text)-1)]
    
    def _hashfunc(self, token: str) -> int:
        """计算token的MD5哈希值，并转换为整数"""
        return int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
    
    def compute(self, text: str) -> int:
        """计算文本的SimHash值（64位整数）"""
        tokens = self._tokenize(text)
        if not tokens:
            return 0
        
        hashes = [self._hashfunc(t) for t in tokens]
        
        # 加权合并: 每个bit位统计正负
        v = [0] * self.hashbits
        for h in hashes:
            for i in range(self.hashbits):
                bit = (h >> i) & 1
                v[i] += 1 if bit else -1
        
        # 根据符号生成最终的SimHash
        simhash = 0
        for i in range(self.hashbits):
            if v[i] > 0:
                simhash |= (1 << i)
        
        return simhash
    
    def hamming_distance(self, hash1: int, hash2: int) -> int:
        """计算两个SimHash的汉明距离（不同bit位的数量）"""
        x = hash1 ^ hash2
        distance = 0
        while x:
            distance += 1
            x &= x - 1  # 清除最低位的1
        return distance
    
    def is_duplicate(self, text: str, existing_hashes: List[int], threshold: int = 3) -> bool:
        """判断文本是否与已有文本重复"""
        if not existing_hashes:
            return False
        text_hash = self.compute(text)
        for h in existing_hashes:
            if self.hamming_distance(text_hash, h) <= threshold:
                return True
        return False


class QuestionDeduplicator:
    """面试题去重器 - 基于SimHash的重复检测"""
    
    def __init__(self):
        self.simhash = SimHash()
        self._hash_cache: Set[int] = set()
    
    def add_hash(self, text: str):
        """添加文本的hash到缓存"""
        h = self.simhash.compute(text)
        if h != 0:  # 跳过空文本
            self._hash_cache.add(h)
    
    def is_duplicate(self, text: str, threshold: int = 3) -> bool:
        """检查文本是否重复"""
        if not self._hash_cache:
            return False
        text_hash = self.simhash.compute(text)
        if text_hash == 0:
            return False
        for h in self._hash_cache:
            if self.simhash.hamming_distance(text_hash, h) <= threshold:
                return True
        return False
    
    def clear(self):
        """清空缓存"""
        self._hash_cache.clear()
    
    @property
    def cache_size(self) -> int:
        """获取缓存大小"""
        return len(self._hash_cache)
