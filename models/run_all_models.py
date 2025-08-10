import subprocess

positions = ["ST", "LW", "RW", "CM", "CDM", "CAM", "LB", "RB", "CB"]

for pos in positions:
    script = f"{pos}_model.py"  # לדוג' ST_model.py
    print(f"Running {script} ...")
    result = subprocess.run(["python", script], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(f"Error in {script}:\n{result.stderr}")
    print("-" * 40)