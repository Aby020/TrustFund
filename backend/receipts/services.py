import io
import logging
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from receipts.models import Receipt
from donations.models import DonationStatus

logger = logging.getLogger(__name__)


class ReceiptService:
    """Service handling receipt creation and PDF generation."""

    @staticmethod
    @transaction.atomic
    def create_receipt_for_donation(donation):
        """
        Create a receipt for a successful donation if it does not already exist.
        """
        if donation.status != DonationStatus.SUCCESS:
            raise DjangoValidationError('Receipts can only be generated for successful donations.')

        # Check for existing receipt (idempotent / duplicate prevention)
        existing = Receipt.objects.filter(donation=donation).first()
        if existing:
            return existing

        receipt = Receipt.objects.create(
            donation=donation,
            donor=donation.donor,
            campaign=donation.campaign,
            charity_organization=donation.campaign.organization,
            amount=donation.amount,
            currency=donation.currency,
            transaction_reference=donation.razorpay_payment_id or donation.razorpay_order_id,
            donation_date=donation.updated_at or donation.created_at,
        )
        logger.info(f'Generated receipt {receipt.receipt_number} for donation {donation.id}')
        return receipt

    @staticmethod
    def generate_pdf_bytes(receipt):
        """
        Generate a professional PDF receipt using ReportLab and return bytes.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54,
        )

        styles = getSampleStyleSheet()
        normal_style = styles['Normal']

        title_style = ParagraphStyle(
            'ReceiptTitle',
            parent=normal_style,
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#1E3A8A'), # Navy blue
            alignment=1, # Centered
        )

        subtitle_style = ParagraphStyle(
            'ReceiptSubtitle',
            parent=normal_style,
            fontName='Helvetica',
            fontSize=11,
            leading=15,
            textColor=colors.HexColor('#4B5563'),
            alignment=1,
        )

        heading_style = ParagraphStyle(
            'SectionHeading',
            parent=normal_style,
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1F2937'),
        )

        cell_style = ParagraphStyle(
            'CellText',
            parent=normal_style,
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#374151'),
        )

        cell_bold = ParagraphStyle(
            'CellBold',
            parent=cell_style,
            fontName='Helvetica-Bold',
        )

        elements = []

        # Header / Organization Info
        elements.append(Paragraph("TRUSTFUND CHARITABLE PLATFORM", title_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph("Official Donation Tax Receipt", subtitle_style))
        elements.append(Spacer(1, 15))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563EB'), spaceBefore=0, spaceAfter=15))

        # Receipt metadata table
        meta_data = [
            [Paragraph("Receipt Number:", cell_bold), Paragraph(receipt.receipt_number, cell_style)],
            [Paragraph("Donation Date:", cell_bold), Paragraph(receipt.donation_date.strftime('%B %d, %Y %H:%M:%S UTC'), cell_style)],
            [Paragraph("Transaction Reference:", cell_bold), Paragraph(receipt.transaction_reference or 'N/A', cell_style)],
        ]
        meta_table = Table(meta_data, colWidths=[150, 354])
        meta_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 15))

        # Donor and Campaign Details
        donor_name = "Anonymous" if receipt.donation.is_anonymous else receipt.donor.email
        details_data = [
            [Paragraph("Donor Information", heading_style), Paragraph("Charity Organization", heading_style)],
            [
                Paragraph(f"<b>Name/Email:</b> {donor_name}", cell_style),
                Paragraph(f"<b>Organization:</b> {receipt.charity_organization.name}<br/><b>Reg No:</b> {receipt.charity_organization.registration_number}<br/><b>Email:</b> {receipt.charity_organization.email}", cell_style)
            ],
            [Paragraph("Campaign Details", heading_style), Paragraph("Donation Summary", heading_style)],
            [
                Paragraph(f"<b>Campaign:</b> {receipt.campaign.title}<br/><b>Category:</b> {receipt.campaign.category}", cell_style),
                Paragraph(f"<b>Amount:</b> {receipt.currency} {receipt.amount:,.2f}<br/><b>Status:</b> SUCCESS", cell_bold)
            ]
        ]

        details_table = Table(details_data, colWidths=[252, 252])
        details_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F3F4F6')),
            ('BACKGROUND', (0,2), (-1,2), colors.HexColor('#F3F4F6')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
        ]))
        elements.append(details_table)
        elements.append(Spacer(1, 25))

        # Footer notes
        footer_text = Paragraph(
            "<i>Thank you for your generous contribution. TrustFund is a registered charitable platform. "
            "This receipt serves as an official acknowledgment of your donation. Please retain this for your tax records.</i>",
            ParagraphStyle('Footer', parent=normal_style, fontName='Helvetica-Oblique', fontSize=9, leading=13, textColor=colors.HexColor('#6B7280'), alignment=1)
        )
        elements.append(footer_text)

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
