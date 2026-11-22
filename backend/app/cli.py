"""Flask CLI commands."""

from __future__ import annotations

import click
from flask import Flask

from app.seed import seed_all


@click.command("seed")
def seed_command() -> None:
    """Load the question bank and recommendation catalog."""
    summary = seed_all()
    # ASCII-only output keeps the command usable from legacy Windows consoles.
    click.echo("Seed complete:")
    click.echo(f"  Pillars:          {summary['pillars']}")
    click.echo(f"  Indicators:       {summary['indicators']}")
    click.echo(f"  Questions:        {summary['questions']}")
    click.echo(f"  Answer options:   {summary['options']}")
    click.echo(f"  Recommendations:  {summary['recommendations']}")


def register_cli(app: Flask) -> None:
    app.cli.add_command(seed_command)
