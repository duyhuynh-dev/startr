"""Tests for real-time WebSocket service."""

from __future__ import annotations

import pytest
from unittest.mock import Mock, MagicMock, AsyncMock
from app.services.realtime import ConnectionManager
from app.models.match import Match


@pytest.mark.unit
class TestConnectionManager:
    """Unit tests for ConnectionManager."""

    @pytest.mark.asyncio
    async def test_connect(self):
        """Test WebSocket connection."""
        manager = ConnectionManager()
        mock_websocket = AsyncMock()
        
        await manager.connect(mock_websocket, "profile-123")
        
        assert "profile-123" in manager.active_connections
        assert mock_websocket in manager.active_connections["profile-123"]
        assert manager.connection_to_profile[mock_websocket] == "profile-123"
        mock_websocket.accept.assert_called_once()

    @pytest.mark.asyncio
    async def test_disconnect(self):
        """Test WebSocket disconnection."""
        manager = ConnectionManager()
        mock_websocket = AsyncMock()
        
        await manager.connect(mock_websocket, "profile-123")
        manager.disconnect(mock_websocket)
        
        assert "profile-123" not in manager.active_connections
        assert mock_websocket not in manager.connection_to_profile

    @pytest.mark.asyncio
    async def test_send_personal_message_no_connections(self):
        """Test sending message when no connections exist."""
        manager = ConnectionManager()
        
        result = await manager.send_personal_message({"type": "test"}, "nonexistent-profile")
        
        assert result is False

    @pytest.mark.asyncio
    async def test_send_personal_message_success(self):
        """Test successfully sending message."""
        manager = ConnectionManager()
        mock_websocket = AsyncMock()
        
        await manager.connect(mock_websocket, "profile-123")
        
        result = await manager.send_personal_message({"type": "test"}, "profile-123")
        
        assert result is True
        mock_websocket.send_json.assert_called_once_with({"type": "test"})

    def test_is_online_true(self):
        """Test is_online when profile is connected."""
        manager = ConnectionManager()
        manager.active_connections["profile-123"] = {Mock()}
        
        assert manager.is_online("profile-123") is True

    def test_is_online_false(self):
        """Test is_online when profile is not connected."""
        manager = ConnectionManager()
        
        assert manager.is_online("nonexistent") is False

    def test_get_online_count(self):
        """Test getting online user count."""
        manager = ConnectionManager()
        manager.active_connections["profile-1"] = {Mock()}
        manager.active_connections["profile-2"] = {Mock()}
        
        assert manager.get_online_count() == 2

    @pytest.mark.asyncio
    async def test_send_typing_indicator(self, db_session):
        """Test sending typing indicator."""
        from app.models.profile import Profile
        
        manager = ConnectionManager()
        
        # Create test profiles
        founder = Profile(
            id="founder-1",
            role="founder",
            full_name="Test Founder",
            email="founder@test.com",
            verification={}
        )
        investor = Profile(
            id="investor-1",
            role="investor",
            full_name="Test Investor",
            email="investor@test.com",
            verification={}
        )
        db_session.add(founder)
        db_session.add(investor)
        db_session.commit()
        
        # Create test match
        match = Match(
            id="match-1",
            founder_id="founder-1",
            investor_id="investor-1",
            status="active"
        )
        db_session.add(match)
        db_session.commit()
        
        # Connect investor
        mock_websocket = AsyncMock()
        await manager.connect(mock_websocket, "investor-1")
        
        # Send typing indicator from founder
        await manager.send_typing_indicator("match-1", "founder-1", True, db_session)
        
        # Investor should receive typing indicator
        mock_websocket.send_json.assert_called()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == "typing"
        assert call_args["match_id"] == "match-1"
        assert call_args["sender_id"] == "founder-1"
        assert call_args["is_typing"] is True

