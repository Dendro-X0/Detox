$ErrorActionPreference = "Stop"

$packDir = Join-Path $PSScriptRoot "..\public\model-packs\toxicity-multi-xlm-r"
New-Item -ItemType Directory -Force -Path $packDir | Out-Null

$files = @(
  @{ name = "config.json"; url = "https://huggingface.co/hoan/multilingual-toxic-xlm-roberta-dynamic-quantized/resolve/main/config.json?download=true" },
  @{ name = "model.onnx"; url = "https://huggingface.co/hoan/multilingual-toxic-xlm-roberta-dynamic-quantized/resolve/main/model_quantized.onnx?download=true" },
  @{ name = "sentencepiece.bpe.model"; url = "https://huggingface.co/hoan/multilingual-toxic-xlm-roberta-dynamic-quantized/resolve/main/sentencepiece.bpe.model?download=true" },
  @{ name = "special_tokens_map.json"; url = "https://huggingface.co/hoan/multilingual-toxic-xlm-roberta-dynamic-quantized/resolve/main/special_tokens_map.json?download=true" },
  @{ name = "tokenizer.json"; url = "https://huggingface.co/hoan/multilingual-toxic-xlm-roberta-dynamic-quantized/resolve/main/tokenizer.json?download=true" },
  @{ name = "tokenizer_config.json"; url = "https://huggingface.co/hoan/multilingual-toxic-xlm-roberta-dynamic-quantized/resolve/main/tokenizer_config.json?download=true" }
)

foreach ($f in $files) {
  $outPath = Join-Path $packDir $f.name
  Write-Host "Downloading $($f.name) ..."
  Invoke-WebRequest -Uri $f.url -OutFile $outPath
}

Write-Host "Done. Files downloaded to: $packDir"
