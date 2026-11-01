FROM python:3.12-slim-bookworm
ENV PIP_NO_CACHE_DIR=1 HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 HF_HUB_DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 PYTHONDONTWRITEBYTECODE=1
RUN pip install 'https://download-r2.pytorch.org/whl/cpu/torch-2.15.0%2Bcpu-cp312-cp312-manylinux_2_28_x86_64.whl#sha256=0955c7e3446326293f48af18fad67872fa31dee5a36a87690eb9e5be8b465be3'
RUN pip install 'transformers==5.22.1' 'tokenizers==0.23.3' 'safetensors==0.8.0'
WORKDIR /app
ENTRYPOINT ["python", "/app/evaluation/nli/run.py"]
