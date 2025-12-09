import json
import os

from flask import jsonify, render_template, request, send_from_directory
from openai import OpenAI

from src import app

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4.1-mini')
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


@app.route('/')
def index():
    return render_template(
        'index.html',
        ai_enabled=bool(OPENAI_API_KEY),
        ai_model=OPENAI_MODEL if OPENAI_API_KEY else None,
    )


@app.route('/service-worker.js')
def service_worker():
    return send_from_directory('static', 'service-worker.js', mimetype='application/javascript')


@app.route('/api/ai-move', methods=['POST'])
def ai_move():
    if not openai_client:
        return jsonify({'available': False, 'reason': 'OPENAI_API_KEY is not configured'}), 503

    data = request.get_json(silent=True) or {}
    state = data.get('state') or {}

    try:
        move = request_ai_move_with_openai(state)
        if move:
            return jsonify({'cards': move, 'source': 'openai'})
    except Exception as error:  # noqa: BLE001 - fallback required for robustness
        app.logger.warning('AI move failed, using fallback: %s', error)

    move = fallback_ai_move(state)
    return jsonify({'cards': move, 'source': 'fallback'})


def request_ai_move_with_openai(state):
    board = state.get('board', [])
    memory = state.get('memory', {})
    difficulty = state.get('difficulty', '')

    system_prompt = (
        'Eres una IA que sugiere las dos cartas a voltear en un juego de memoria. '
        'Utiliza la información provista (cartas vistas, coincidencias conocidas y estado actual) '
        'para escoger el par más prometedor. Responde exclusivamente con un JSON válido '
        'en el formato {"cards": [indice1, indice2]} sin texto adicional. '
        'Los índices empiezan en 0 y deben ser distintos y corresponder a cartas no emparejadas.'
    )

    known_cards = [
        f"{card.get('index')}: {card.get('icon')} ({card.get('status')})"
        for card in board
        if card.get('status') in {'flipped', 'matched'}
    ]

    memory_lines = [f"{icon}: {indexes}" for icon, indexes in memory.items()]

    user_prompt = (
        f"Dificultad: {difficulty}. Cartas totales: {len(board)}.\n"
        f"Estado visible: {'; '.join(known_cards) if known_cards else 'Ninguna carta visible.'}\n"
        f"Recuerdos previos: {'; '.join(memory_lines) if memory_lines else 'Sin recuerdos previos.'}\n"
        "Elige dos índices distintos de cartas que no estén emparejadas y maximicen la probabilidad de coincidencia."
    )

    response = openai_client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
        temperature=0,
        max_tokens=50,
    )

    content = response.choices[0].message.content
    move = json.loads(content).get('cards')

    if not (isinstance(move, list) and len(move) == 2):
        raise ValueError('La respuesta no contiene dos índices válidos')

    return [int(move[0]), int(move[1])]


def fallback_ai_move(state):
    board = state.get('board', [])
    memory = state.get('memory', {})

    unmatched = [card for card in board if card.get('status') != 'matched']
    index_to_card = {card.get('index'): card for card in unmatched}

    for indexes in memory.values():
        available = [idx for idx in indexes if index_to_card.get(idx)]
        if len(available) >= 2:
            return available[:2]

    singles = [idx for indexes in memory.values() if len(indexes) == 1 for idx in indexes]
    singles = [idx for idx in singles if index_to_card.get(idx)]
    hidden_cards = [card.get('index') for card in unmatched if card.get('status') == 'hidden']

    first = singles[0] if singles else (hidden_cards[0] if hidden_cards else None)

    if first is None:
        return [0, 1]

    second_candidates = [idx for idx in hidden_cards if idx != first]
    second = second_candidates[0] if second_candidates else first

    return [first, second]
