use std::fmt::{Display, Formatter};

pub type AiosResult<T> = Result<T, AiosStateError>;

#[derive(Debug)]
pub enum AiosStateError {
    Database(rusqlite::Error),
    Io(std::io::Error),
    InvalidInput(String),
    InvalidData(String),
    Uninitialized,
    LockPoisoned,
}

impl Display for AiosStateError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Database(error) => write!(f, "database error: {error}"),
            Self::Io(error) => write!(f, "io error: {error}"),
            Self::InvalidInput(message) => write!(f, "invalid input: {message}"),
            Self::InvalidData(message) => write!(f, "invalid data: {message}"),
            Self::Uninitialized => write!(f, "AIOS state database is not initialized"),
            Self::LockPoisoned => write!(f, "AIOS state database lock is poisoned"),
        }
    }
}

impl std::error::Error for AiosStateError {}

impl From<rusqlite::Error> for AiosStateError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Database(value)
    }
}

impl From<std::io::Error> for AiosStateError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}
