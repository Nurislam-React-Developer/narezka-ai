"""
services/task_manager.py — Глобальное хранилище для фоновых задач (чтобы показывать прогресс фронтенду).
"""
import uuid

# Глобальный словарь для задач:
# { "uuid": {"status": "downloading" | "cutting" | "done" | "error", "progress": int, "result": dict, "error": str} }
tasks = {}

def create_task() -> str:
    task_id = uuid.uuid4().hex
    tasks[task_id] = {
        "status": "starting",
        "progress": 0,
        "result": None,
        "error": None
    }
    return task_id

def get_task(task_id: str) -> dict | None:
    return tasks.get(task_id)

def update_task_progress(task_id: str, status: str, progress: int = None):
    if task_id in tasks:
        tasks[task_id]["status"] = status
        if progress is not None:
            tasks[task_id]["progress"] = progress

def set_task_done(task_id: str, result: dict):
    if task_id in tasks:
        tasks[task_id]["status"] = "done"
        tasks[task_id]["progress"] = 100
        tasks[task_id]["result"] = result

def set_task_error(task_id: str, error_msg: str):
    if task_id in tasks:
        tasks[task_id]["status"] = "error"
        tasks[task_id]["error"] = error_msg
