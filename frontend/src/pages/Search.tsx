import React, { useState } from 'react';

const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/search/persons?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.status === 'success') {
        setResults(data.data.hits);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Search Persons</h2>
      <form onSubmit={handleSearch} className="mb-4">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, biography, clan..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      <div className="search-results">
        {results.length > 0 ? (
          <ul className="list-group">
            {results.map((hit) => (
              <li key={hit.person.id} className="list-group-item">
                <h5>{hit.person.primary_name.given_name} {hit.person.primary_name.surname}</h5>
                <p className="mb-1">{hit.person.biography}</p>
                <small className="text-muted">Clan: {hit.person.clan} | Tribe: {hit.person.tribe}</small>
              </li>
            ))}
          </ul>
        ) : (
          !loading && query && <p>No results found.</p>
        )}
      </div>
    </div>
  );
};

export default Search;
