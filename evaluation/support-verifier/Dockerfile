FROM node:24-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends git cmake build-essential libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*
RUN git init /opt/llama && git -C /opt/llama fetch --depth 1 https://github.com/ggml-org/llama.cpp.git 8642541b255bfb5dc39cd351a178be09013a55d6 && git -C /opt/llama checkout --detach FETCH_HEAD && test "$(git -C /opt/llama rev-parse HEAD)" = "8642541b255bfb5dc39cd351a178be09013a55d6"
RUN cmake -S /opt/llama -B /opt/llama/build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DGGML_CUDA=OFF -DGGML_NATIVE=ON -DGGML_BLAS=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_APP=OFF -DLLAMA_BUILD_IS_DEV=OFF -DLLAMA_BUILD_UI=OFF -DLLAMA_USE_PREBUILT_UI=OFF -DLLAMA_OPENSSL=OFF && cmake --build /opt/llama/build --target llama-server -j 4
WORKDIR /app
USER node
ENTRYPOINT ["node","evaluation/dist/evaluation/support-verifier/run.cjs"]
