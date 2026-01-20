"""Media metadata management using Redis."""

import os
import redis

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "redis_secure_password_789")

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD, decode_responses=True)

def add_tag(filename: str, tag: str):
    r.sadd(f"media:tags:{filename}", tag)
    r.sadd(f"media:tagindex:{tag}", filename)

def get_tags(filename: str):
    return list(r.smembers(f"media:tags:{filename}"))

def add_to_album(filename: str, album: str):
    r.sadd(f"media:album:{album}", filename)

def get_album(album: str):
    return list(r.smembers(f"media:album:{album}"))

def search_by_tag(tag: str):
    return list(r.smembers(f"media:tagindex:{tag}"))

def add_media_date(filename: str, date: str):
    r.zadd("media:timeline", {filename: int(date.replace('-', ''))})

def get_media_timeline(start: int = None, end: int = None):
    return r.zrangebyscore("media:timeline", start or '-inf', end or '+inf')
