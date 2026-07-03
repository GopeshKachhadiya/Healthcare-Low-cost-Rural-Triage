"""
Training Script: Medical NER & Intent Classifier (Agents R2 & S1)
Architecture: DistilBERT fine-tuning via Hugging Face Transformers
"""

import os
from datasets import load_dataset
from transformers import (
    AutoTokenizer, 
    AutoModelForTokenClassification, 
    TrainingArguments, 
    Trainer,
    DataCollatorForTokenClassification
)

def main():
    model_checkpoint = "distilbert-base-uncased"
    print(f"Loading pretrained model checkpoint: {model_checkpoint}")
    
    tokenizer = AutoTokenizer.from_pretrained(model_checkpoint)
    
    # Example labels for Medical NER
    label_list = [
        "O", 
        "B-SYMPTOM", "I-SYMPTOM", 
        "B-BODY_PART", "I-BODY_PART", 
        "B-DRUG", "I-DRUG", 
        "B-CONDITION", "I-CONDITION"
    ]
    
    # Load model
    model = AutoModelForTokenClassification.from_pretrained(
        model_checkpoint, 
        num_labels=len(label_list)
    )
    
    # NOTE: You must provide a dataset formatted for token classification (NER).
    # This assumes a Hugging Face 'datasets' compatible format (e.g. JSON lines or CSV)
    # with 'tokens' and 'ner_tags' columns.
    print("Please ensure your dataset is loaded here.")
    # Example: dataset = load_dataset("json", data_files={"train": "path/to/train.json", "validation": "path/to/val.json"})
    
    # Mocking a dataset structure for the script to compile
    # In reality, you'd map your MedQuAD/Symptom2Disease dataset to this format.
    # def tokenize_and_align_labels(examples):
    #     tokenized_inputs = tokenizer(examples["tokens"], truncation=True, is_split_into_words=True)
    #     # Align labels logic here...
    #     return tokenized_inputs
    
    # tokenized_datasets = dataset.map(tokenize_and_align_labels, batched=True)
    
    training_args = TrainingArguments(
        output_dir="./runs/medical_nlp",
        evaluation_strategy="epoch",
        learning_rate=2e-5,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=16,
        num_train_epochs=3,
        weight_decay=0.01,
        push_to_hub=False,
    )
    
    data_collator = DataCollatorForTokenClassification(tokenizer)
    
    # trainer = Trainer(
    #     model=model,
    #     args=training_args,
    #     train_dataset=tokenized_datasets["train"],
    #     eval_dataset=tokenized_datasets["validation"],
    #     data_collator=data_collator,
    #     tokenizer=tokenizer,
    # )
    
    print("Setup complete. Uncomment the Trainer section and provide your dataset to begin training.")
    # trainer.train()
    # trainer.save_model("./saved_models/medical_ner")

if __name__ == '__main__':
    main()
