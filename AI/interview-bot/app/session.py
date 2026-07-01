import uuid

sessions = {}

def create_session(role):

    session_id = str(uuid.uuid4())

    sessions[session_id] = {
        "role": role,
        "current_question": 0,
        "scores": [],
        "answers": []
    }

    return session_id