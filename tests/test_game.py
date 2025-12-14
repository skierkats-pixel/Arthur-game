import pytest

from arthur_game.game import Game, format_status, main


def test_player_attack_reduces_enemy_health():
    game = Game()
    damage, defeated = game.player_attack()

    assert damage == 5
    assert defeated is False
    assert game.enemy.health == 10


def test_enemy_attack_reduces_player_health():
    game = Game()
    damage = game.enemy_attack()

    assert damage == 3
    assert game.player.health == 17


def test_heal_restores_health_without_exceeding_max():
    game = Game()
    game.player.receive_damage(10)
    healed = game.heal_player()

    assert healed == 5
    assert game.player.health == 17

    healed_again = game.heal_player(10)
    assert healed_again == 3
    assert game.player.health == game.player.max_health


def test_turn_sequence_stops_when_enemy_defeated():
    game = Game()
    state = game.play_sequence(["attack", "attack", "attack"])

    assert state["enemy_health"] == 0
    assert not game.enemy.is_alive
    assert "Mordred has been defeated!" in game.history


def test_turn_handles_unknown_action():
    game = Game()
    game.turn("dance")

    assert "hesitates" in " ".join(game.history)


def test_main_returns_battle_log():
    log = main(["attack", "heal", "attack", "attack"])

    assert log[0].startswith("Arthur enters")
    assert "Final status: Arthur" in log[-1]


def test_format_status_reports_values():
    game = Game()
    game.player.receive_damage(4)
    game.enemy.receive_damage(3)

    status_text = format_status(game)

    assert "18/20" in status_text
    assert "13/15" in status_text
