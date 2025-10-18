'use strict'; 
// import { DynamoDBClient,DynamoDB } from "@aws-sdk/client-dynamodb";
// import { DynamoDBDocumentClient,PutCommand } from "@aws-sdk/lib-dynamodb";

/**
 * Minimal API adapter. Swap out STUBS for real `fetch` calls later.
 * Keep the same method signatures to make switching trivial.
 */
const USE_STUBS = true;
const state = {
  grantor: null,
  grantorLoaded: false,
};

const api = {
  getGrantor() {
    if (USE_STUBS) {
      return new Promise(resolve => {
        setTimeout(() => resolve({
            first_name: 'John',
            last_name: 'Doe',
            email: 'iamgrantor@sym.com'
        }), 100);
      });
    } else {
      // return fetch('/api/user/grantor', { credentials: 'include' })
      //   .then(res => {
      //     if (!res.ok) throw new Error('Failed to load grantor');
      //     return res.json();
      //   });
      throw new Error('API not configured.');
    }
  },

  /**
   * createDelegate(payload): Promise<{ ok: boolean }>
   * payload includes:
   *  - delegate_first_name, delegate_last_name, delegate_email
   *  - grantor_first_name, grantor_last_name, grantor_email
   *  - event_id = 'DELEGATE'
   */
  createDelegate(payload) {

    if (USE_STUBS) {
      return new Promise((resolve, reject) => {
        setTimeout(() => resolve({ ok: true }), 400);
      });
    } else {
      // return fetch('/api/delegates', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      //   credentials: 'include'
      // }).then(res => {
      //   if (!res.ok) throw new Error('Failed to create delegate');
      //   return res.json();
      // });
      // throw new Error('API not configured.');
    }
  }
};

//------------------------------------------------------------------------------

async function putItemIntoDynamoDB(payload) {
  console.log('...Starting...');
  
  const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
  const { PutCommand } = require("@aws-sdk/lib-dynamodb");

  const docClient = new DynamoDBClient({ 
    region: 'us-west-2',
    credentials: {
      accessKeyId: "ASIAXEKWIOY77C3C2SZ4",
      secretAccessKey: "Gj7qrtJM8f6jyLnYrQE0zO4tdO",
    },
  });

  console.log('Convert payload to attributes:', payload);

  const command = new PutCommand({
    TableName: "icap-delegate-access-tbl",
    Item: {
      'delegate_email': {'S': payload.delegate_email},
      'delegate_first_name': {'S': payload.delegate_first_name},
      'delegate_last_name': {'S': payload.delegate_last_name},
      'grantor_email': {'S': payload.grantor_email},
      'grantor_first_name': {'S': payload.grantor_first_name},
      'grantor_last_name': {'S': payload.grantor_last_name},
      'delegate-access-event-id ': {'S': payload.event_id},
    },
  });

  try {
    const response = docClient.send(command);
    console.log("Item added successfully:", response);
    return response;
  } catch (error) {
    console.error("Error adding item:", error);
  }
}
//------------------------------------------------------------------------------
function getDomain(email) {
  if (!email || typeof email !== 'string') return '';
  const at = email.indexOf('@');
  return at > -1 ? email.slice(at + 1).trim().toLowerCase() : '';
}

function isValidEmailFormat(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim());
}

function setBusy(message) {
  const btn = document.getElementById('submitBtn');
  const status = document.getElementById('status');
  btn.disabled = !!message || !state.grantorLoaded;
  status.textContent = message;
  status.classList = null;
  status.classList.add('info');
}

function setError(message) {
    const btn = document.getElementById('submitBtn');
    btn.disabled = false;
    const status = document.getElementById('status');
    status.textContent = message;
    status.classList = null;
    status.classList.add('error');
}

function setSuccess(message) {
    const btn = document.getElementById('submitBtn');
    btn.disabled = false;
    const status = document.getElementById('status');
    status.textContent = message;
    status.classList = null;
    status.classList.add('success');
}

function showEmailError(message) {
  const el = document.getElementById('emailError');
  if (message) {
    el.textContent = message;
    el.style.display = 'block';
  } else {
    el.textContent = '';
    el.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const submitBtn = document.getElementById('submitBtn');
  const delegateEmail = document.getElementById('delegateEmail');

  try {
    setBusy('Loading grantor info...');
    const grantor = await api.getGrantor();
    state.grantor = grantor;
    state.grantorLoaded = true;
    document.getElementById('grantorFirst').value = grantor.first_name || '';
    document.getElementById('grantorLast').value = grantor.last_name || '';
    document.getElementById('grantorEmail').value = grantor.email || '';
    submitBtn.disabled = false;
    setBusy('');
  } catch (err) {
    state.grantorLoaded = false;
    submitBtn.disabled = true;
    setError(err.message || 'Failed to load grantor info. Please try again later.');
  }

  delegateEmail.addEventListener('input', () => {
    validateEmailAgainstGrantor();
  });

  submitBtn.addEventListener('click', onSubmit);
});

function validateEmailAgainstGrantor() {
  const emailInput = document.getElementById('delegateEmail');
  const email = emailInput.value.trim();
  showEmailError('');

  if (!email) return true;
  if (!isValidEmailFormat(email)) {
    showEmailError('Please enter a valid email address.');
    return false;
  }

  const grantorEmail = (state.grantor && state.grantor.email) ? state.grantor.email : '';
  const grantorDomain = getDomain(grantorEmail);
  const delegateDomain = getDomain(email);

  if (!grantorDomain) {
    showEmailError('Grantor domain not available.');
    return false;
  }

  if (delegateDomain !== grantorDomain) {
    showEmailError(`Email domain must match the Grantor's domain (${grantorDomain}).`);
    return false;
  }

  return true;
}

async function onSubmit() {
  if (!state.grantorLoaded) return;

  const df = document.getElementById('delegateFirst').value.trim();
  const dl = document.getElementById('delegateLast').value.trim();
  const de = document.getElementById('delegateEmail').value.trim();

  let firstInvalid = null;
  if (!df) firstInvalid = firstInvalid || 'delegateFirst';
  if (!dl) firstInvalid = firstInvalid || 'delegateLast';
  if (!de) firstInvalid = firstInvalid || 'delegateEmail';

  const emailOk = validateEmailAgainstGrantor();

  if (firstInvalid || !emailOk) {
    if (firstInvalid) document.getElementById(firstInvalid).focus();
    return;
  }

  const payload = {
    delegate_first_name: df,
    delegate_last_name:  dl,
    delegate_email:      de,
    grantor_first_name:  state.grantor.first_name || '',
    grantor_last_name:   state.grantor.last_name || '',
    grantor_email:       state.grantor.email || '',
    event_id:            'DELEGATE'
  };

  setBusy('Submitting...');
  try {
    await api.createDelegate(payload);

    console.log('Sending request to function....');
    
    const res = await putItemIntoDynamoDB(payload);
    console.log('Finished putting item into DynamoDB', res);

    setSuccess(`Delegate ${df} ${dl} (${de}) added successfully.`);
    const form = document.getElementById('delegate-form');
    form.reset();
  } catch (err) {
    setError(err.message || 'Failed to add delegate. Please try again.');
  }
}
