/**
 * GST & E-Way Bill Service
 * Handles compliance with Indian tax standards (NIC/GSTN)
 */
export const GSTService = {
  /**
   * Validates a GSTIN (Placeholder for NIC/GSP API)
   */
  async validateGSTIN(gstin: string) {
    // Regex for basic validation
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    if (!gstRegex.test(gstin)) {
      return { valid: false, message: "Invalid GSTIN format" }
    }

    // In production, this would call the GST Portal API
    // return await fetch(`https://api.gst.gov.in/v1/gstin/${gstin}`)
    
    return { 
      valid: true, 
      data: {
        legalName: "Simulated Taxpayer Name",
        tradeName: "Simulated Trade Name",
        status: "Active",
        state: "Maharashtra"
      }
    }
  },

  /**
   * Generates NIC-compliant E-Way Bill JSON
   */
  generateEWayBillJSON(invoice: any, transportData: any) {
    // Reference: NIC E-Way Bill API Specification
    return {
      supplyType: "O", // Outward
      subSupplyType: "1", // Supply
      docType: "INV",
      docNo: invoice.invoice_number,
      docDate: new Date(invoice.issue_date).toLocaleDateString('en-GB'),
      fromGstin: invoice.owner_gstin,
      fromTrdName: invoice.owner_company,
      fromAddr1: invoice.owner_address || "Address Line 1",
      fromAddr2: "",
      fromPlace: invoice.owner_city || "City",
      fromPincode: 400001,
      fromStateCode: 27, // Maharashtra
      actualFromStateCode: 27,
      toGstin: invoice.customer_gst_no,
      toTrdName: invoice.customer_name,
      toAddr1: invoice.customer_address || "Customer Address",
      toAddr2: "",
      toPlace: invoice.customer_city || "Customer City",
      toPincode: 400001,
      toStateCode: 27,
      actualToStateCode: 27,
      totalValue: invoice.subtotal,
      cgstValue: invoice.gst_amount / 2,
      sgstValue: invoice.gst_amount / 2,
      igstValue: 0,
      cessValue: 0,
      totInvValue: invoice.total_amount,
      transporterId: transportData.transporterId,
      transporterName: transportData.transporterName,
      transDistance: transportData.distance,
      transMode: transportData.mode === "Road" ? "1" : "2",
      vehicleNo: transportData.vehicleNo,
      vehicleType: "R", // Regular
      itemList: [
        {
          productName: "Goods",
          productDesc: "General Goods",
          hsnCode: 8517, // Placeholder
          quantity: 1,
          qtyUnit: "NOS",
          taxableAmount: invoice.subtotal,
          sgstRate: invoice.gst_rate / 2,
          cgstRate: invoice.gst_rate / 2,
          igstRate: 0,
          cessRate: 0
        }
      ]
    }
  }
}
