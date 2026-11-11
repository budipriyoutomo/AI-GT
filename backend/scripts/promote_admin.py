"""
Angkat / turunkan role user (A-1).

Admin pertama HARUS dibuat lewat script ini — tidak ada endpoint yang bisa
memberi role admin ke diri sendiri, supaya user tak bisa mengangkat dirinya.

  aigt/bin/python scripts/promote_admin.py <email>                 # jadi admin
  aigt/bin/python scripts/promote_admin.py <email> --superadmin    # jadi superadmin
  aigt/bin/python scripts/promote_admin.py <email> --demote        # kembali jadi user
  aigt/bin/python scripts/promote_admin.py --list                  # daftar admin
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.user import User

VALID_ROLES = ("user", "admin", "superadmin")


async def _list_admins() -> None:
    async with AsyncSessionLocal() as db:
        rows = await db.scalars(
            select(User).where(User.role.in_(("admin", "superadmin"))).order_by(User.email)
        )
        admins = list(rows)
        if not admins:
            print("Belum ada admin. Buat dengan: promote_admin.py <email>")
            return
        print(f"{len(admins)} admin:")
        for u in admins:
            print(f"  {u.role:<11} {u.email}  ({u.name})")


async def _set_role(email: str, role: str) -> None:
    async with AsyncSessionLocal() as db:
        user = await db.scalar(select(User).where(User.email == email.lower()))
        if not user:
            print(f"GAGAL — user {email} tidak ditemukan.")
            sys.exit(1)
        if user.role == role:
            print(f"Tidak berubah — {user.email} sudah ber-role '{role}'.")
            return
        before = user.role
        user.role = role
        await db.commit()
        print(f"OK — {user.email}: {before} → {role}")


def main() -> None:
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        return
    if args[0] == "--list":
        asyncio.run(_list_admins())
        return

    email = args[0]
    flags = set(args[1:])
    if "--demote" in flags:
        role = "user"
    elif "--superadmin" in flags:
        role = "superadmin"
    else:
        role = "admin"
    asyncio.run(_set_role(email, role))


if __name__ == "__main__":
    main()
