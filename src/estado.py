import operator
from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class Estado(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    proximo: str
    ciclos_react: Annotated[int, operator.add]
    tokens_supervisor: Annotated[int, operator.add]
    workers_escolhidos: Annotated[list[str], operator.add]
    tipo_ambiguidade: str
    confianca: int
    complexidade: int
    fallback_count: Annotated[int, operator.add]
