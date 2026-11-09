from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns user notifications. If inbox is empty, populates initial operational alerts.
    """
    user_notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(desc(Notification.created_at)).all()

    # Seed demo notifications if empty for a rich user experience
    if not user_notifications:
        demo_items = [
            Notification(
                user_id=current_user.id,
                title="Master Roster Published",
                message="November 2026 operations schedule has been published with 80.6% initial coverage.",
                notification_type="SUCCESS",
                link_url="/roster",
                is_read=False,
            ),
            Notification(
                user_id=current_user.id,
                title="Critical Coverage Gap Alert",
                message="ChaiCraft process 'Abandoned Cart Conversions' is unstaffed on Nov 14 due to specialist off.",
                notification_type="ALERT",
                link_url="/conflicts",
                is_read=False,
            ),
            Notification(
                user_id=current_user.id,
                title="Pending Approval Queue",
                message="You have 2 pending leave and compensatory credit requests awaiting operational review.",
                notification_type="WARNING",
                link_url="/approvals",
                is_read=False,
            ),
            Notification(
                user_id=current_user.id,
                title="Labor Compliance Notice",
                message="All scheduled shifts currently satisfy the 6-day statutory maximum rest day policy.",
                notification_type="INFO",
                link_url="/roster",
                is_read=True,
            ),
        ]
        db.add_all(demo_items)
        db.commit()
        user_notifications = db.query(Notification).filter(
            Notification.user_id == current_user.id
        ).order_by(desc(Notification.created_at)).all()

    return user_notifications


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marks a notification as read.
    """
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marks all notifications for current user as read.
    """
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})

    db.commit()
    return {"message": "All notifications marked as read."}
