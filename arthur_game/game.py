from dataclasses import dataclass, field
from typing import Dict, List, Tuple


@dataclass
class Character:
    name: str
    health: int
    attack_power: int
    defense: int
    max_health: int = field(init=False)

    def __post_init__(self) -> None:
        self.max_health = self.health

    @property
    def is_alive(self) -> bool:
        return self.health > 0

    def receive_damage(self, amount: int) -> int:
        damage = max(1, amount - self.defense)
        self.health = max(0, self.health - damage)
        return damage

    def heal(self, amount: int) -> int:
        before = self.health
        self.health = min(self.max_health, self.health + amount)
        return self.health - before


class Game:
    def __init__(self) -> None:
        self.player = Character(name="Arthur", health=20, attack_power=6, defense=2)
        self.enemy = Character(name="Mordred", health=15, attack_power=5, defense=1)
        self.history: List[str] = []

    def _log(self, message: str) -> None:
        self.history.append(message)

    def _status(self) -> Dict[str, int]:
        return {
            "player_health": self.player.health,
            "enemy_health": self.enemy.health,
        }

    def player_attack(self) -> Tuple[int, bool]:
        damage = self.enemy.receive_damage(self.player.attack_power)
        self._log(f"Arthur strikes for {damage} damage.")
        defeated = not self.enemy.is_alive
        if defeated:
            self._log("Mordred has been defeated!")
        return damage, defeated

    def enemy_attack(self) -> int:
        damage = self.player.receive_damage(self.enemy.attack_power)
        self._log(f"Mordred retaliates for {damage} damage.")
        return damage

    def heal_player(self, amount: int = 5) -> int:
        healed = self.player.heal(amount)
        if healed > 0:
            self._log(f"Arthur heals for {healed} health.")
        else:
            self._log("Arthur is already at full health.")
        return healed

    def turn(self, action: str) -> Dict[str, int]:
        if not self.player.is_alive or not self.enemy.is_alive:
            self._log("The battle is over.")
            return self._status()

        action = action.lower()
        if action == "attack":
            self.player_attack()
        elif action == "heal":
            self.heal_player()
        elif action == "status":
            self._log("Arthur pauses to assess the battle.")
        else:
            self._log("Arthur hesitates, unsure what to do.")

        if self.enemy.is_alive:
            self.enemy_attack()
        elif not self.player.is_alive:
            self._log("Arthur has fallen in battle.")

        return self._status()

    def play_sequence(self, actions: List[str]) -> Dict[str, int]:
        state: Dict[str, int] = self._status()
        for action in actions:
            state = self.turn(action)
            if not self.player.is_alive or not self.enemy.is_alive:
                break
        return state


def format_status(game: Game) -> str:
    return (
        f"Arthur: {game.player.health}/{game.player.max_health} HP | "
        f"Mordred: {game.enemy.health}/{game.enemy.max_health} HP"
    )


def main(actions: List[str]) -> List[str]:
    game = Game()
    game._log("Arthur enters the field against Mordred!")
    game.play_sequence(actions)
    game._log(f"Final status: {format_status(game)}")
    return game.history


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Play a short Arthurian duel.")
    parser.add_argument(
        "actions",
        metavar="ACTION",
        nargs="*",
        default=["attack", "attack", "attack"],
        help="Sequence of actions such as 'attack', 'heal', or 'status'",
    )
    args = parser.parse_args()

    log = main(args.actions)
    for entry in log:
        print(entry)
