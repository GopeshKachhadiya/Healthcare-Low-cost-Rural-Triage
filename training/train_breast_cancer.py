"""
Training Script: Breast Cancer Classifier (Agent H5)
Architecture: YOLOv8 Classification
"""

from ultralytics import YOLO

def main():
    # Define dataset path - Replace with your actual dataset path
    # The dataset should be structured in standard ImageNet format:
    # dataset/
    # ├── train/
    # │   ├── Malignant/
    # │   └── Benign/
    # └── val/
    #     ├── Malignant/
    #     └── Benign/
    dataset_yaml = 'path/to/breast_cancer_dataset'
    
    # Load pretrained YOLOv8 nano classification model
    pretrained_model = 'yolov8n-cls.pt'
    
    print(f"Loading pretrained model: {pretrained_model}")
    model = YOLO(pretrained_model)
    
    print("Starting training for Breast Cancer classification...")
    
    results = model.train(
        data=dataset_yaml,
        epochs=50,
        imgsz=224,
        batch=32,
        project='runs/breast_cancer',
        name='yolov8_breast_classifier',
        device='0' # Use 'cpu' if no GPU
    )
    
    print("Training complete! Model saved to runs/breast_cancer/yolov8_breast_classifier/weights/best.pt")

if __name__ == '__main__':
    main()
