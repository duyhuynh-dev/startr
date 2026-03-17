#!/usr/bin/env python3
"""
Delete test users (and their profiles + related data) by email.
Usage: from backend dir with venv active:
  python scripts/delete_test_users.py
"""
from __future__ import annotations

import os
import sys

# Ensure app is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import or_
from sqlmodel import Session, select

from app.db.session import engine
from app.models.match import DailyLimit, Like, Match, Pass, ProfileView
from app.models.message import Message
from app.models.notification import Notification
from app.models.profile import Profile
from app.models.startup_of_month import StartupOfMonth
from app.models.user import User

EMAILS_TO_DELETE = [
    "huynhngocbaoduy1101@gmail.com",
    "huynhduymath@gmail.com",
    "duy.hnb11@gmail.com",
]


def delete_test_users() -> None:
    with Session(engine) as session:
        users = list(session.exec(select(User).where(User.email.in_(EMAILS_TO_DELETE))).all())
        if not users:
            print("No users found with those emails. Nothing to delete.")
            return

        profile_ids = [u.profile_id for u in users if u.profile_id]
        user_ids = [u.id for u in users]

        # Match IDs that involve these profiles (so we can delete messages first)
        match_ids = []
        if profile_ids:
            rows = session.exec(
                select(Match.id).where(
                    (Match.founder_id.in_(profile_ids)) | (Match.investor_id.in_(profile_ids))
                )
            ).all()
            match_ids = list(rows)

        # 1) Notifications (recipient or actor is one of our profiles)
        n_notif = 0
        if profile_ids:
            for n in session.exec(
                select(Notification).where(
                    (Notification.recipient_id.in_(profile_ids))
                    | (Notification.actor_id.in_(profile_ids))
                )
            ).all():
                session.delete(n)
                n_notif += 1
        print(f"Deleted {n_notif} notifications.")

        # 2) Messages in those matches or sent by our profiles
        n_msg = 0
        msg_conds = []
        if profile_ids:
            msg_conds.append(Message.sender_id.in_(profile_ids))
        if match_ids:
            msg_conds.append(Message.match_id.in_(match_ids))
        if msg_conds:
            for m in session.exec(select(Message).where(or_(*msg_conds))).all():
                session.delete(m)
                n_msg += 1
        print(f"Deleted {n_msg} messages.")

        # 3) Matches involving these profiles
        n_match = 0
        for m in session.exec(
            select(Match).where(
                (Match.founder_id.in_(profile_ids)) | (Match.investor_id.in_(profile_ids))
            )
        ).all():
            session.delete(m)
            n_match += 1
        print(f"Deleted {n_match} matches.")

        # 4) Likes (sender or recipient)
        n_like = 0
        if profile_ids:
            for row in session.exec(
                select(Like).where(
                    (Like.sender_id.in_(profile_ids)) | (Like.recipient_id.in_(profile_ids))
                )
            ).all():
                session.delete(row)
                n_like += 1
        print(f"Deleted {n_like} likes.")

        # 5) Passes
        n_pass = 0
        if profile_ids:
            for row in session.exec(
                select(Pass).where(
                    (Pass.user_id.in_(profile_ids)) | (Pass.passed_profile_id.in_(profile_ids))
                )
            ).all():
                session.delete(row)
                n_pass += 1
        print(f"Deleted {n_pass} passes.")

        # 6) Profile views
        n_pv = 0
        if profile_ids:
            for row in session.exec(
                select(ProfileView).where(
                    (ProfileView.viewer_id.in_(profile_ids))
                    | (ProfileView.viewed_profile_id.in_(profile_ids))
                )
            ).all():
                session.delete(row)
                n_pv += 1
        print(f"Deleted {n_pv} profile_views.")

        # 7) Daily limits
        n_dl = 0
        if profile_ids:
            for row in session.exec(
                select(DailyLimit).where(DailyLimit.profile_id.in_(profile_ids))
            ).all():
                session.delete(row)
                n_dl += 1
        print(f"Deleted {n_dl} daily_limits.")

        # 8) Startup of month
        n_som = 0
        if profile_ids:
            for row in session.exec(
                select(StartupOfMonth).where(StartupOfMonth.profile_id.in_(profile_ids))
            ).all():
                session.delete(row)
                n_som += 1
        print(f"Deleted {n_som} startup_of_month.")

        # 9) Users
        for u in users:
            session.delete(u)
        print(f"Deleted {len(users)} users.")

        # 10) Profiles
        if profile_ids:
            for p in session.exec(select(Profile).where(Profile.id.in_(profile_ids))).all():
                session.delete(p)
            print(f"Deleted {len(profile_ids)} profiles.")

        session.commit()
    print("Done. Test users and related data removed.")


if __name__ == "__main__":
    delete_test_users()
