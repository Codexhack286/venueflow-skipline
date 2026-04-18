"""
YOLOv8 Person Detection Demo (Local Only — Not Deployed)

This script demonstrates how computer vision would feed the VenueFlow system
in production. It uses YOLOv8 nano to detect people in stadium footage and
outputs per-zone person counts.

Requirements (not included in main project):
  pip install ultralytics opencv-python

Usage:
  python detect.py --source stadium_clip.mp4 --output output/counts.json
"""

import json
import argparse
from pathlib import Path


def run_detection(source: str, output: str, conf_threshold: float = 0.25):
    """
    Run YOLOv8 nano person detection on a video source.

    In production, this would run on edge devices (NVIDIA Jetson, etc.)
    and stream counts to the VenueFlow backend in real-time.
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        print("ultralytics not installed. Install with: pip install ultralytics")
        print("Generating sample output instead...")
        _generate_sample_output(output)
        return

    # Load YOLOv8 nano — smallest model, runs on CPU
    model = YOLO("yolov8n.pt")

    # COCO class 0 = person
    PERSON_CLASS = 0

    results_data = []
    frame_id = 0

    # Process video frame by frame
    results = model(source, stream=True, conf=conf_threshold)

    for result in results:
        frame_id += 1
        boxes = result.boxes

        # Count persons only
        person_count = sum(1 for box in boxes if int(box.cls[0]) == PERSON_CLASS)

        results_data.append({
            "frame_id": frame_id,
            "person_count": person_count,
            "confidence_avg": float(
                sum(box.conf[0] for box in boxes if int(box.cls[0]) == PERSON_CLASS)
                / max(person_count, 1)
            ),
        })

        if frame_id % 30 == 0:
            print(f"Frame {frame_id}: {person_count} people detected")

    # Save results
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w") as f:
        json.dump(results_data, f, indent=2)

    print(f"Detection complete. {frame_id} frames processed. Output: {output}")


def _generate_sample_output(output: str):
    """Generate sample output matching the pre-baked data format."""
    # Copy from the backend's sample_counts.json
    sample_path = Path(__file__).parent.parent / "backend" / "cv_data" / "sample_counts.json"
    if sample_path.exists():
        import shutil
        Path(output).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(sample_path, output)
        print(f"Copied sample data to {output}")
    else:
        print("No sample data found. Run the backend first.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="YOLOv8 Stadium Person Detection")
    parser.add_argument("--source", type=str, default="stadium_clip.mp4",
                        help="Video source file")
    parser.add_argument("--output", type=str, default="output/counts.json",
                        help="Output JSON path")
    parser.add_argument("--conf", type=float, default=0.25,
                        help="Confidence threshold")
    args = parser.parse_args()

    run_detection(args.source, args.output, args.conf)
