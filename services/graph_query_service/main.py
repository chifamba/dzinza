"""Main entry point for graph_query_service service."""

from fastapi import FastAPI, Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from shared.app_logging import setup_logging
from shared.healthcheck import get_healthcheck_router

import strawberry
from strawberry.fastapi import GraphQLRouter

from .schemas import Query

app = FastAPI()
logger = setup_logging("graph_query_service")

app.include_router(get_healthcheck_router("graph_query_service"))

# Auth middleware
security = HTTPBearer()

def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)):
    import jwt
    import os
    secret = os.getenv("JWT_SECRET", "testsecret")
    try:
        payload = jwt.decode(credentials.credentials, secret, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing JWT"
        )

# GraphQL setup
schema = strawberry.Schema(query=Query)
graphql_app = GraphQLRouter(schema, graphiql=True)

import time

rate_limit_store = {}

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.url.path.startswith("/graphql"):
        # Rate limiting: 10 requests per minute per IP
        ip = request.client.host
        now = int(time.time())
        window = now // 60
        key = f"{ip}:{window}"
        count = rate_limit_store.get(key, 0)
        if count >= 10:
            return HTTPException(status_code=429, detail="Rate limit exceeded")
        rate_limit_store[key] = count + 1
        auth = request.headers.get("authorization")
        if not auth:
            return HTTPException(status_code=401, detail="Authorization header missing")
        try:
            scheme, token = auth.split()
            if scheme.lower() != "bearer":
                raise ValueError()
            import jwt
            import os
            secret = os.getenv("JWT_SECRET", "testsecret")
            payload = jwt.decode(token, secret, algorithms=["HS256"])
            # Authorization: require role claim
            if "role" not in payload or payload["role"] not in ["user", "admin"]:
                raise HTTPException(status_code=403, detail="Insufficient permissions")
        except HTTPException as e:
            raise e
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid or missing JWT")
        # Query depth and complexity limiting
        if request.method == "POST":
            import time as _time
            body = await request.json()
            query = body.get("query", "")
            # Log queries
            user = payload.get("sub", "unknown")
            logger.info(f"GraphQL query by user={user}: {query}")
            # Query analytics
            global _query_field_counter
            if "_query_field_counter" not in globals():
                _query_field_counter = {}
            for field in [line.strip().split("(")[0] for line in query.split("{") if line.strip()]:
                if field not in _query_field_counter:
                    _query_field_counter[field] = 0
                _query_field_counter[field] += 1
            # Monitor performance
            start_time = _time.time()
            max_depth = 5
            max_complexity = 20
            depth = query.count("{")
            complexity = query.count("{") + query.count("(")
            if depth > max_depth:
                return HTTPException(status_code=400, detail="Query depth limit exceeded")
            if complexity > max_complexity:
                return HTTPException(status_code=400, detail="Query complexity limit exceeded")
            response = await call_next(request)
            duration = _time.time() - start_time
            logger.info(f"GraphQL query by user={user} took {duration:.3f}s")
            return response
    response = await call_next(request)
    return response

from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def graphql_error_handler(request, exc):
    logger.error(f"GraphQL error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"errors": [{"message": str(exc)}]}
    )

app.include_router(graphql_app, prefix="/graphql")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting graph_query_service service...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
