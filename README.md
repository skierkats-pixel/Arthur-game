# Arthur Game

A lightweight, text-based duel between Arthur and Mordred. The project includes a simple combat engine plus accompanying unit tests.

## Running the game

You can run a quick duel by providing a sequence of actions (attack, heal, status) from the command line:

```bash
python -m arthur_game attack heal attack attack
```

If no actions are given, Arthur will swing his sword three times by default.

## Development

Install test dependencies (pytest is used for unit tests) and run the suite:

```bash
pip install -r requirements.txt
pytest
```

## Project layout

- `arthur_game/`: Game logic and entry point.
- `tests/`: Unit tests covering combat and utility helpers.
