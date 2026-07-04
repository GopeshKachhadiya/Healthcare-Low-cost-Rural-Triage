import os
import subprocess
import time
import sys

# Map of ONLY the essential chat agents (all lightweight API-based now)
AGENTS = [
    ("orchestrators/patient_orchestrator/main.py", 8080),
    ("rag_agents/rag_pipeline/main.py", 8031),
    ("safety_agents/red_flag_monitor/main.py", 8021),
    ("safety_agents/consent_gate/main.py", 8022),
]

processes = []

def start_agent(path, port):
    if not os.path.exists(path):
        print(f"[Warning] {path} not found. Skipping.")
        return None
        
    print(f"[Start] Starting {path} on port {port}...")
    module_path = path.replace("/", ".").replace(".py", "")
    
    cmd = [sys.executable, "-m", "uvicorn", module_path + ":app", "--host", "0.0.0.0", "--port", str(port)]
    
    env = os.environ.copy()
    if sys.platform == 'win32':
        p = subprocess.Popen(cmd, env=env, creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
    else:
        p = subprocess.Popen(cmd, env=env, preexec_fn=os.setsid)
        
    return p
 
try:
    print("==========================================")
    print("Starting Lightweight Chat Agents Only")
    print("==========================================\n")
    
    for path, port in AGENTS:
        p = start_agent(path, port)
        if p:
            processes.append(p)
            time.sleep(1.0)
            
    print("\n[Success] Essential Chat Agents started successfully!")
    print("Go ahead and test the frontend now!")
    
    while True:
        time.sleep(1)
        
except KeyboardInterrupt:
    print("\n\n[Stop] Shutting down...")
    
    for p in processes:
        try:
            if sys.platform == 'win32':
                p.send_signal(subprocess.signal.CTRL_BREAK_EVENT)
            else:
                p.terminate()
        except:
            pass
            
    print("Goodbye!")
    sys.exit(0)
