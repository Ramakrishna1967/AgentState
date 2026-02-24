import os
import time
import asyncio
from agentstack import observe, Tracer, flush

# Ensure we use the correct collector URL
os.environ["AGENTSTACK_COLLECTOR_URL"] = "http://localhost:4318/v1/traces"
os.environ["AGENTSTACK_API_KEY"] = "ak_demo123" # Mock API key

tracer = Tracer(service_name="demo_agent")

@observe(name="agent.research")
def research_topic(topic: str):
    span = Tracer.get_current_span()
    span.set_attribute("input_payload", f"Search Wikipedia for: {topic}")
    
    print(f"Researching: {topic}...")
    time.sleep(1.2) # Simulate network call
    
    result = f"Wikipedia snippet for {topic}: The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris."
    span.set_attribute("output_payload", result)
    span.set_attribute("tool.name", "wikipedia_search")
    return result

@observe(name="agent.summarize")
def summarize_text(text: str):
    span = Tracer.get_current_span()
    span.set_attribute("input_payload", f"Please summarize this text: {text}")
    
    print("Summarizing...")
    time.sleep(2.5) # Simulate LLM thinking
    
    summary = "The Eiffel Tower is a famous tower in Paris, France."
    span.set_attribute("output_payload", summary)
    span.set_attribute("llm.model", "gpt-4-turbo")
    span.set_attribute("llm.tokens.in", 45)
    span.set_attribute("llm.tokens.out", 12)
    return summary

@observe(name="agent.main_workflow")
def run_agent_workflow():
    print("Starting agent workflow...")
    span = Tracer.get_current_span()
    span.set_attribute("input_payload", "User Request: Tell me about the Eiffel Tower")
    
    # Step 1: Research
    research_data = research_topic("Eiffel Tower")
    
    # Step 2: Summarize
    final_output = summarize_text(research_data)
    
    span.set_attribute("output_payload", final_output)
    print(f"Final Output: {final_output}")

if __name__ == "__main__":
    run_agent_workflow()
    
    # Important: Flush the telemetry data before exiting
    print("Flushing telemetry data to AgentStack...")
    flush()
    print("Done! Check the dashboard.")
    
