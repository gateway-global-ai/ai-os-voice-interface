use crate::state_machine::{AiosResult, AiosStateError};
use rusqlite::Connection;
use std::sync::Mutex;

pub struct AiosDbState {
    connection: Mutex<Option<Connection>>,
}

impl Default for AiosDbState {
    fn default() -> Self {
        Self {
            connection: Mutex::new(None),
        }
    }
}

impl AiosDbState {
    pub fn set_connection(&self, connection: Connection) -> AiosResult<()> {
        let mut guard = self
            .connection
            .lock()
            .map_err(|_| AiosStateError::LockPoisoned)?;
        *guard = Some(connection);
        Ok(())
    }

    pub fn with_connection<T, F>(&self, operation: F) -> AiosResult<T>
    where
        F: FnOnce(&Connection) -> AiosResult<T>,
    {
        let guard = self
            .connection
            .lock()
            .map_err(|_| AiosStateError::LockPoisoned)?;
        let connection = guard.as_ref().ok_or(AiosStateError::Uninitialized)?;
        operation(connection)
    }
}
