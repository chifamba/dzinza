import psycopg2

conn = psycopg2.connect(
    dbname="dzinza_db",
    user="dzinza_user",
    password=open("secrets/db_password.txt").read().strip(),
    host="localhost",
    port=5432
)
cur = conn.cursor()
cur.execute("SELECT id, email FROM users WHERE email IN ('test@dzinza.com', 'admin@dzinza.org');")
rows = cur.fetchall()
for row in rows:
    print(f"User: {row[1]}, UUID: {row[0]}")
cur.close()
conn.close()
