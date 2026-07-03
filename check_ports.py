import urllib.request

ports = [8000, 8050, 8001, 8006, 8031, 8021, 8022, 8011, 8012, 8013, 8014, 8015, 8016, 8008, 8002, 8003, 8004, 8005, 8009, 8007, 8041]

for p in ports:
    try:
        urllib.request.urlopen(f"http://localhost:{p}/docs", timeout=0.5)
        print(f"Port {p}: Online")
    except Exception as e:
        print(f"Port {p}: Offline ({type(e).__name__})")
