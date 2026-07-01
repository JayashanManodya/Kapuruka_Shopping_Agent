from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

from config import SERVER_URL


class KaprukaMCPClient:

    async def call(self, tool_name: str, params: dict):

        async with streamablehttp_client(SERVER_URL) as (
            read_stream,
            write_stream,
            _,
        ):

            async with ClientSession(
                read_stream,
                write_stream,
            ) as session:

                await session.initialize()

                return await session.call_tool(
                    tool_name,
                    arguments={
                        "params": params
                    },
                )