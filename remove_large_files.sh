#!/bin/bash

# Remove large files from Git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch \
  venv/lib/python3.9/site-packages/scipy/.dylibs/libopenblas.0.dylib \
  venv/lib/python3.9/site-packages/onnxruntime/capi/onnxruntime_pybind11_state.so \
  venv/lib/python3.9/site-packages/numpy/.dylibs/libopenblas64_.0.dylib \
  venv/lib/python3.9/site-packages/torch/lib/libtorch_cpu.dylib" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up and optimize the repository
git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now 