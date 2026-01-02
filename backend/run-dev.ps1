$ErrorActionPreference = 'Stop'

# Ensure we run from the backend folder regardless of where the shell was opened
Set-Location -Path $PSScriptRoot

# Make the local "app" package importable even when uvicorn spawns/reloads on Windows
$env:PYTHONPATH = $PSScriptRoot

python -m uvicorn app.main:app `
  --host 0.0.0.0 `
  --port 8000 `
  --reload `
  --reload-dir $PSScriptRoot

