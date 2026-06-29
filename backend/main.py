import os
import sys
import uvicorn

# Ensure the backend root directory is in the Python search path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config.settings import settings

def main():
    print(f"Starting FastAPI server on http://{settings.host}:{settings.port} (env: {settings.env})")
    uvicorn.run(
        "app.api:app",
        host=settings.host,
        port=settings.port,
        reload=(settings.env == "development")
    )


if __name__ == "__main__":
    main()
