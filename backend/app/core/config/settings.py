from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Server Configuration
    host: str = Field("127.0.0.1", validation_alias="API_HOST")
    port: int = Field(8000, validation_alias="API_PORT")
    env: str = Field("development", validation_alias="ENV")

    # MCP Server URL
    server_url: str = Field("https://mcp.kapruka.com/mcp", validation_alias="SERVER_URL")

    # LLM Provider Configuration
    groq_api_key: str = Field(..., validation_alias="GROQ_API_KEY")
    llm_model: str = Field("openai/gpt-oss-20b", validation_alias="LLM_MODEL")

settings = Settings()
