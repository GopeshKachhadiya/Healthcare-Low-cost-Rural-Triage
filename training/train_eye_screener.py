"""
Training Script: Eye Disease Screener (Agent P2)
Architecture: YOLOv8 Classification
"""

from ultralytics import YOLO

def main():
    # Define dataset path - Replace with your actual dataset path
    # The dataset should be structured in standard ImageNet format:
    # dataset/
    # ├── train/
    # │   ├── Normal/
    # │   ├── Diabetic Retinopathy/
    # │   ├── Glaucoma/
    # │   ├── Cataract/
    # │   └── AMD/
    # └── val/
    #     ├── Normal/
    #     └── ...
    dataset_yaml = 'path/to/eye_disease_dataset'
    
    pretrained_model = 'yolov8n-cls.pt'
    
    print(f"Loading pretrained model: {pretrained_model}")
    model = YOLO(pretrained_model)
    
    print("Starting training for Eye Disease screening...")
    
    results = model.train(
        data=dataset_yaml,
        epochs=50,
        imgsz=224,
        batch=32,
        project='runs/eye_screener',
        name='yolov8_eye_classifier',
        device='0'
    )
    
    print("Training complete! Model saved to runs/eye_screener/yolov8_eye_classifier/weights/best.pt")

if __name__ == '__main__':
    main()
