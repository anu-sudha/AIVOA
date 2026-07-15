from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from .llm import reasoning_llm
from .tools import ALL_TOOLS

SYSTEM_PROMPT = """You are the AI Assistant embedded in an HCP (Healthcare
Professional) CRM used by pharma field reps. You help reps log interactions
with doctors either from free text or step-by-step conversation, look up
history, suggest follow-ups, find materials/samples, and edit past entries.

Always prefer calling a tool over answering from memory when the request
involves logging, editing, searching, or scheduling something. After a tool
runs, summarize the result for the rep in one or two friendly sentences.
"""

_checkpointer = MemorySaver()

# create_react_agent wires the LLM + tools into a LangGraph StateGraph that
# loops between "reason" and "act" (tool-call) nodes until the model decides
# it has a final answer — this is the LangGraph agent required by the task.
agent_graph = create_react_agent(
    model=reasoning_llm,
    tools=ALL_TOOLS,
    checkpointer=_checkpointer,
    prompt=SYSTEM_PROMPT,
)


def run_agent(message: str, thread_id: str = "default"):
    """Send a chat message through the LangGraph agent and return the final
    reply text plus the list of tool names that were invoked."""
    config = {"configurable": {"thread_id": thread_id}}
    result = agent_graph.invoke({"messages": [("user", message)]}, config=config)

    messages = result["messages"]
    tool_calls = []
    for m in messages:
        if getattr(m, "tool_calls", None):
            tool_calls.extend(tc["name"] for tc in m.tool_calls)

    reply = messages[-1].content
    return reply, tool_calls
