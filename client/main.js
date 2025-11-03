// Sample data for Indian states and districts
const statesData = {
    "andhra-pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
    "bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
    "delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
    "gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
    "karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
    "maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
    "tamil-nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
    "uttar-pradesh": ["Agra", "Aligarh", "Allahabad", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Faizabad", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kanshiram Nagar", "Kaushambi", "Kushinagar", "Lakhimpur Kheri", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Rae Bareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
    "west-bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"]
};

// DOM elements
const dateInput = document.getElementById('date');
const stateSelect = document.getElementById('state');
const districtSelect = document.getElementById('district');
const submitBtn = document.getElementById('submit-btn');

// Set today's date as default
function setDefaultDate() {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    dateInput.value = formattedDate;
}

// Populate states dropdown
function populateStates() {
    const states = Object.keys(statesData);
    
    states.forEach(state => {
        const option = document.createElement('option');
        // Convert state name to display format (e.g., "andhra-pradesh" -> "Andhra Pradesh")
        const displayName = state.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        option.value = state;
        option.textContent = displayName;
        stateSelect.appendChild(option);
    });
}

// Populate districts based on selected state
function populateDistricts(state) {
    // Clear previous districts
    districtSelect.innerHTML = '<option value="" disabled selected>Select a district</option>';
    
    if (state && statesData[state]) {
        const districts = statesData[state];
        
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district.toLowerCase().replace(/\s+/g, '-');
            option.textContent = district;
            districtSelect.appendChild(option);
        });
        
        // Enable district select
        districtSelect.disabled = false;
    } else {
        // Disable district select if no state selected
        districtSelect.disabled = true;
    }
    
    // Update submit button state
    updateSubmitButton();
}

// Update submit button state based on selections
function updateSubmitButton() {
    const dateSelected = dateInput.value;
    const stateSelected = stateSelect.value;
    const districtSelected = districtSelect.value;
    
    if (dateSelected && stateSelected && districtSelected) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}

// Handle form submission
function handleSubmit() {
    const date = dateInput.value;
    const state = stateSelect.value;
    const district = districtSelect.value;
    
    // In a real application, you would redirect or fetch data here
    alert(`Data Request:\nDate: ${date}\nState: ${state}\nDistrict: ${district}`);
    
    // For demonstration, we'll just show an alert
    console.log({
        date,
        state,
        district
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Set default date
    setDefaultDate();
    
    // Populate states on page load
    populateStates();
    
    // Date input change
    dateInput.addEventListener('change', updateSubmitButton);
    
    // State selection change
    stateSelect.addEventListener('change', function() {
        populateDistricts(this.value);
    });
    
    // District selection change
    districtSelect.addEventListener('change', updateSubmitButton);
    
    // Submit button click
    submitBtn.addEventListener('click', handleSubmit);
    
    // Sign in button click
    document.querySelector('.sign-in-btn').addEventListener('click', function() {
        alert('Sign In functionality would be implemented here');
    });
});