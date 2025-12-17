# download_models.py

from huggingface_hub import snapshot_download

# Define the models you want to download
models_to_download = [
    "distilbert-base-uncased-finetuned-sst-2-english",
    "facebook/bart-large-cnn"
]

# Define the local directory where models will be saved
local_models_dir = "models"

# Loop through the list and download each model
for model_name in models_to_download:
    print(f"Downloading {model_name}...")
    
    # snapshot_download downloads all necessary files for a model
    snapshot_download(
        repo_id=model_name, 
        local_dir=f"{local_models_dir}/{model_name}",
        local_dir_use_symlinks=False # Set to False to avoid issues on Windows
    )
    
    print(f"Finished downloading {model_name}.")

print("\nAll models downloaded successfully!")