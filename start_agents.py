import os
import subprocess
import time
import sys
import psutil

# Map of all agent paths to their intended ports
AGENTS = [
    # Orchestrators
    ("orchestrators/patient_orchestrator/main.py", 8080),
    ("orchestrators/hospital_orchestrator/main.py", 8050),
    
    # NLP & RAG Agents
    # ("nlp_agents/language_processor/main.py", 8001), # Heavy HF model
    # ("nlp_agents/query_understanding/main.py", 8006), # Heavy HF model
    ("rag_agents/rag_pipeline/main.py", 8031),
    
    # Safety Agents
    ("safety_agents/red_flag_monitor/main.py", 8021),
    ("safety_agents/consent_gate/main.py", 8022),
    
    # Action Agents
    ("action_agents/appointment_manager/main.py", 8011),
    ("action_agents/hospital_locator/main.py", 8012),
    ("action_agents/followup_scheduler/main.py", 8013),
    ("action_agents/prescription_generator/main.py", 8014),
    ("action_agents/drug_interaction_checker/main.py", 8015),
    ("action_agents/referral_manager/main.py", 8016),
    
    # CV & Imaging Agents (Commented out to prevent RAM crash / HuggingFace downloads)
    # ("cv_agents/mri_preprocessor/main.py", 8008),
    # ("cv_agents/brain_tumor_segmenter/main.py", 8002),
    # ("cv_agents/brain_tumor_classifier/main.py", 8003),
    # ("cv_agents/xray_analyzer/main.py", 8004),
    # ("cv_agents/skin_screener/main.py", 8005),
    # ("cv_agents/cancer_screening_engine/main.py", 8009),
    # ("cv_agents/imaging_interpreter/main.py", 8007),
    
    # Monitoring Agents
    ("monitoring_agents/dashboard/main.py", 8041),
]

processes = []

def start_agent(path, port):
    if not os.path.exists(path):
        print(f"[Warning] {path} not found. Skipping.")
        return None
        
    print(f"[Start] Starting {path} on port {port}...")
    # Use uvicorn module to start it programmatically
    module_path = path.replace("/", ".").replace(".py", "")
    
    # Use python -m uvicorn instead of directly calling uvicorn so it works regardless of PATH issues
    cmd = [sys.executable, "-m", "uvicorn", module_path + ":app", "--host", "0.0.0.0", "--port", str(port)]
    
    # Set env to limit OpenBLAS threads and avoid memory allocation errors on Windows
    env = os.environ.copy()
    env["OPENBLAS_NUM_THREADS"] = "1"
    
    # Create the process and put it in a new process group so we can kill them all later
    if sys.platform == 'win32':
        p = subprocess.Popen(cmd, env=env, creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
    else:
        p = subprocess.Popen(cmd, env=env, preexec_fn=os.setsid)
        
    return p
 
try:
    print("==========================================")
    print("[Hospital] Starting Anvaya Multi-Agent Ecosystem")
    print("==========================================\n")
    
    for path, port in AGENTS:
        p = start_agent(path, port)
        if p:
            processes.append(p)
            time.sleep(1.5)  # Stagger startups to avoid CPU spike
            
    print("\n[Success] All agents started successfully!")
    print("Press Ctrl+C to shut down the entire system.")
    
    # Keep the main thread alive
    while True:
        time.sleep(1)
        
except KeyboardInterrupt:
    print("\n\n[Stop] Shutting down all Anvaya agents...")
    
    for p in processes:
        try:
            if sys.platform == 'win32':
                p.send_signal(subprocess.signal.CTRL_BREAK_EVENT)
            else:
                p.terminate()
        except:
            pass
            
    print("Goodbye! [Bye]")
    sys.exit(0)
