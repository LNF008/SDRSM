"""Flask CLI commands."""

from __future__ import annotations

import click
from flask import Flask

from app.seed import seed_all


@click.command("seed")
@click.option(
    "--demo/--no-demo",
    default=True,
    help="Also create the demo account and its sample assessments.",
)
def seed_command(demo: bool) -> None:
    """Load the question bank, recommendations and (optionally) demo data."""
    summary = seed_all(with_demo=demo)
    # ASCII-only output keeps the command usable from legacy Windows consoles.
    click.echo("Seed complete:")
    click.echo(f"  Pillars:          {summary['pillars']}")
    click.echo(f"  Indicators:       {summary['indicators']}")
    click.echo(f"  Questions:        {summary['questions']}")
    click.echo(f"  Answer options:   {summary['options']}")
    click.echo(f"  Recommendations:  {summary['recommendations']}")
    click.echo(f"  Demo user:        {summary['demoUser']}")
    click.echo(f"  Demo assessments added: {summary['demoAssessments']}")


def register_cli(app: Flask) -> None:
    app.cli.add_command(seed_command)
