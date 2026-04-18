"""
YOLOv8 Person Detection Demo (Local Only — Not Deployed)

This script demonstrates how computer vision would feed the VenueFlow system
in production. It uses YOLOv8 to detect people in stadium footage and
outputs per-zone person counts.

Requirements (not included in main project):
  pip install ultralytics opencv-python

Usage:
  python detect.py --source stadium_clip.mp4 --output output/counts.json

Tips for better detection on stadium/crowd footage:
  - Use --imgsz 1280 or 1920 for higher resolution (catches small people)
  - Use --conf 0.15 for lower confidence threshold (more detections)
  - Use --model yolov8s.pt or yolov8m.pt for better accuracy
  - For very dense crowds, consider --model yolov8x.pt
"""

import json
import argparse
from pathlib import Path


def run_detection(
    source: str,
    output: str,
    conf_threshold: float = 0.15,
    model_name: str = "yolov8s.pt",
    imgsz: int = 1280,
):
    """
    Run YOLOv8 person detection on a video source.

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

    # Load model — yolov8s is a good balance of speed & accuracy for crowds
    # Available: yolov8n.pt (fastest), yolov8s.pt, yolov8m.pt, yolov8l.pt, yolov8x.pt (best)
    print(f"Loading model: {model_name}")
    print(f"Input resolution: {imgsz}px | Confidence threshold: {conf_threshold}")
    model = YOLO(model_name)

    # COCO class 0 = person
    PERSON_CLASS = 0

    results_data = []
    frame_id = 0
    total_persons = 0

    # Process video frame by frame
    # imgsz controls internal processing resolution — higher = better for small objects
    results = model(
        source,
        stream=True,
        conf=conf_threshold,
        imgsz=imgsz,
        classes=[PERSON_CLASS],  # Only detect persons — faster inference
        verbose=False,
    )

    for result in results:
        frame_id += 1
        boxes = result.boxes

        # Count persons detected in this frame
        person_count = len(boxes)
        total_persons += person_count

        # Average confidence score
        if person_count > 0:
            avg_conf = float(sum(box.conf[0].item() for box in boxes) / person_count)
        else:
            avg_conf = 0.0

        results_data.append({
            "frame_id": frame_id,
            "person_count": person_count,
            "confidence_avg": round(avg_conf, 3),
        })

        if frame_id % 30 == 0:
            print(f"Frame {frame_id}: {person_count} people detected (avg conf: {avg_conf:.2f})")

    # Summary
    avg_per_frame = total_persons / max(frame_id, 1)
    peak_frame = max(results_data, key=lambda x: x["person_count"]) if results_data else {}
    print(f"\n{'='*50}")
    print(f"Detection complete!")
    print(f"  Frames processed: {frame_id}")
    print(f"  Avg persons/frame: {avg_per_frame:.1f}")
    print(f"  Peak frame: #{peak_frame.get('frame_id', 'N/A')} ({peak_frame.get('person_count', 0)} people)")
    print(f"  Model: {model_name} @ {imgsz}px, conf={conf_threshold}")
    print(f"  Output: {output}")

    # Save results
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    output_data = {
        "metadata": {
            "model": model_name,
            "imgsz": imgsz,
            "confidence_threshold": conf_threshold,
            "total_frames": frame_id,
            "avg_persons_per_frame": round(avg_per_frame, 1),
            "peak_count": peak_frame.get("person_count", 0),
        },
        "frames": results_data,
    }
    with open(output, "w") as f:
        json.dump(output_data, f, indent=2)


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
    parser = argparse.ArgumentParser(
        description="YOLOv8 Stadium Person Detection",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Default (good for most stadium footage)
  python detect.py --source stadium_clip.mp4

  # Max accuracy for dense crowds (slower)
  python detect.py --source stadium_clip.mp4 --model yolov8x.pt --imgsz 1920

  # Quick test run (fastest, lower accuracy)
  python detect.py --source stadium_clip.mp4 --model yolov8n.pt --imgsz 640
        """,
    )
    parser.add_argument("--source", type=str, default="stadium_clip.mp4",
                        help="Video source file")
    parser.add_argument("--output", type=str, default="output/counts.json",
                        help="Output JSON path")
    parser.add_argument("--conf", type=float, default=0.15,
                        help="Confidence threshold (lower = more detections, default: 0.15)")
    parser.add_argument("--model", type=str, default="yolov8s.pt",
                        help="YOLO model to use (yolov8n/s/m/l/x.pt, default: yolov8s.pt)")
    parser.add_argument("--imgsz", type=int, default=1280,
                        help="Processing resolution (higher = better for small people, default: 1280)")
    args = parser.parse_args()

    run_detection(args.source, args.output, args.conf, args.model, args.imgsz)
