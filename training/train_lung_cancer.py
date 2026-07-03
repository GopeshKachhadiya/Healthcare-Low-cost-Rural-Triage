"""
Training Script: Lung Cancer Classifier (Agent H5)
Architecture: YOLOv8 Classification
"""

from ultralytics import YOLO
import os

def main():
    # Define dataset path - Replace with your actual dataset path
    # The dataset should be structured in standard ImageNet format:
    # dataset/
    # ├── train/
    # │   ├── Adenocarcinoma/
    # │   ├── Large Cell/
    # │   ├── Squamous Cell/
    # │   └── Normal/
    # └── val/
    #     ├── Adenocarcinoma/
    #     ├── ...
    dataset_yaml = 'path/to/lung_cancer_dataset'
    
    # Ensure you have the pre-trained weights downloaded
    # It will automatically download if not found locally
    pretrained_model = 'yolov8n-cls.pt'
    
    print(f"Loading pretrained model: {pretrained_model}")
    model = YOLO(pretrained_model)
    
    print("Starting training...")
    # Train the model
    # Adjust hyperparameters as needed based on GPU availability
    results = model.train(
        data=dataset_yaml,
        epochs=50,
        imgsz=224,
        batch=32,
        project='runs/lung_cancer',
        name='yolov8_lung_classifier',
        device='0' # Use 'cpu' if no GPU, or '0,1' for multi-GPU
    )
    
    print("Training complete! Model saved to runs/lung_cancer/yolov8_lung_classifier/weights/best.pt")

if __name__ == '__main__':
    main()
