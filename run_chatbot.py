"""
run_chatbot.py — Single-command chatbot backend launcher.
Automatically kills any ghost process on the target port, then starts fresh.
"""
import os
import sys
import subprocess
import signal

PORT = 9000  # Use 9000 to avoid conflicts with any previous runs

def kill_port(port):
    """Kill any process occupying the target port on Windows."""
    try:
        result = subprocess.run(
            f"netstat -ano | findstr :{port}",
            shell=True, capture_output=True, text=True
        )
        for line in result.stdout.strip().splitlines():
            parts = line.split()
            if parts and "LISTENING" in line:
                pid = parts[-1]
                print(f"[Kill] Found ghost process PID {pid} on port {port}. Killing it...")
                subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
                print(f"[Kill] Done.")
                return
        print(f"[Info] Port {port} is free.")
    except Exception as e:
        print(f"[Warning] Could not check port: {e}")

def main():
    print("=" * 50)
    print("  Anvaya Medical Chatbot Backend")
    print(f"  Port: {PORT}")
    print("=" * 50)
    print()

    # Step 1: Kill any ghost process on the port
    kill_port(PORT)

    path = "orchestrators/patient_orchestrator/main.py"

    if not os.path.exists(path):
        print(f"[Error] Cannot find: {path}")
        print("Please run this from the Healthcare-Low-cost-Rural-Triage directory.")
        sys.exit(1)

    module_path = path.replace("/", ".").replace("\\", ".").replace(".py", "")
    cmd = [
        sys.executable, "-m", "uvicorn",
        f"{module_path}:app",
        "--host", "0.0.0.0",
        "--port", str(PORT),
        "--log-level", "info"
    ]

    env = os.environ.copy()
    print(f"[Start] Launching backend on http://localhost:{PORT}")
    print(f"        Press Ctrl+C to stop.\n")

    try:
        subprocess.run(cmd, env=env)
    except KeyboardInterrupt:
        print("\n[Stop] Chatbot backend shut down. Goodbye!")

if __name__ == "__main__":
    main()
