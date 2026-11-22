"""Linked external identity accounts (Google, ...)."""

from __future__ import annotations

from app.extensions import db
from app.models.base import iso_utc, utcnow


class OAuthAccount(db.Model):
    """An external identity linked to a local SDRSM user.

    Keeping the provider subject in its own table means existing user rows do
    not need schema changes when a new sign-in provider is added.
    """

    __tablename__ = "oauth_accounts"
    __table_args__ = (
        db.UniqueConstraint("provider", "subject", name="uq_oauth_provider_subject"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider = db.Column(db.String(30), nullable=False)
    subject = db.Column(db.String(191), nullable=False)
    email = db.Column(db.String(190))
    avatar_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    user = db.relationship("User", back_populates="oauth_accounts")

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "email": self.email or "",
            "avatarUrl": self.avatar_url or "",
            "linkedAt": iso_utc(self.created_at),
        }
