from __future__ import annotations

import unittest
from types import SimpleNamespace
from typing import Any

from opc.plugins.office_ui.services.context import OfficeServiceContext
from opc.plugins.office_ui.services.models import ServiceError
from opc.plugins.office_ui.services.session import SessionService


class _Store:
    def __init__(self) -> None:
        self.saved: list[Any] = []

    async def save_task(self, task: Any) -> None:
        self.saved.append(task)


def _task(**overrides: Any) -> SimpleNamespace:
    task = SimpleNamespace(
        id="task-role-1",
        session_id="sess-1",
        project_id="demo",
        title="Role task",
        parent_session_id=None,
        metadata={},
        org_id=None,
    )
    for key, value in overrides.items():
        setattr(task, key, value)
    return task


def _context(*, hook: Any | None = None) -> OfficeServiceContext:
    engine = SimpleNamespace(project_id="demo", store=_Store(), memory=None)
    context = OfficeServiceContext(engine=engine, agent_store=None, chat_store=None, event_adapter=None)
    if hook is not None:
        context.get_active_saved_org_name = hook
    return context


class TestPersistSessionConfigOrgFallback(unittest.IsolatedAsyncioTestCase):
    async def _persist(
        self,
        context: OfficeServiceContext,
        task: Any,
        *,
        exec_mode: str = "org",
        company_profile: str = "custom",
        org_id: str = "",
    ) -> None:
        await SessionService(context).persist_session_config(
            task,
            exec_mode=exec_mode,
            company_profile=company_profile,
            preferred_agent="native",
            org_id=org_id,
        )

    async def test_falls_back_to_active_saved_org_when_task_lacks_org_id(self) -> None:
        async def active_org() -> str:
            return "vc-investment-firm"

        context = _context(hook=active_org)
        task = _task()

        await self._persist(context, task)

        assert task.metadata["org_id"] == "vc-investment-firm"
        assert task.metadata["organization_id"] == "vc-investment-firm"
        assert task.org_id == "vc-investment-firm"
        assert task.metadata["exec_mode"] == "org"
        assert task.metadata["company_profile"] == "custom"
        assert context.engine.store.saved == [task]

    async def test_explicit_org_id_still_used_when_present(self) -> None:
        async def active_org() -> str:
            return "other-org"

        context = _context(hook=active_org)
        task = _task()

        await self._persist(context, task, org_id="vc-investment-firm")

        assert task.metadata["org_id"] == "vc-investment-firm"
        assert task.org_id == "vc-investment-firm"

    async def test_raises_when_no_active_org_available(self) -> None:
        async def empty_org() -> str:
            return ""

        context = _context(hook=empty_org)
        task = _task()

        with self.assertRaises(ServiceError) as ctx:
            await self._persist(context, task)
        assert ctx.exception.code == "org_id_required"

    async def test_raises_when_hook_unset(self) -> None:
        context = _context()
        task = _task()

        with self.assertRaises(ServiceError) as ctx:
            await self._persist(context, task)
        assert ctx.exception.code == "org_id_required"

    async def test_raises_when_hook_fails(self) -> None:
        async def broken() -> str:
            raise RuntimeError("org index unreadable")

        context = _context(hook=broken)
        task = _task()

        with self.assertRaises(ServiceError) as ctx:
            await self._persist(context, task)
        assert ctx.exception.code == "org_id_required"

    async def test_company_mode_clears_org_fields_without_fallback(self) -> None:
        fallback_called = False

        async def active_org() -> str:
            nonlocal fallback_called
            fallback_called = True
            return "vc-investment-firm"

        context = _context(hook=active_org)
        task = _task(metadata={"org_id": "stale-org"})

        await self._persist(
            context,
            task,
            exec_mode="company",
            company_profile="corporate",
        )

        assert not fallback_called
        assert "org_id" not in task.metadata
        assert "organization_id" not in task.metadata
        assert task.org_id is None

    async def test_task_mode_ignores_org_entirely(self) -> None:
        fallback_called = False

        async def active_org() -> str:
            nonlocal fallback_called
            fallback_called = True
            return "vc-investment-firm"

        context = _context(hook=active_org)
        task = _task()

        await self._persist(
            context,
            task,
            exec_mode="task",
            company_profile="corporate",
        )

        assert not fallback_called
        assert task.metadata["execution_mode"] == "task_mode"
        assert "org_id" not in task.metadata
        assert task.org_id is None


if __name__ == "__main__":
    unittest.main()
