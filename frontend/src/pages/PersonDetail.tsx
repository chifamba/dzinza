import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const PersonDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerson();
  }, [id]);

  const fetchPerson = async () => {
    try {
      const response = await fetch(`/api/v1/genealogy/persons/${id}`);
      const data = await response.json();
      if (data.status === 'success') {
        setPerson(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch person:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading person details...</div>;
  if (!person) return <div>Person not found.</div>;

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-body">
          <h2 className="card-title">{person.primary_name.given_name} {person.primary_name.surname}</h2>
          <hr />
          <div className="row">
            <div className="col-md-6">
              <p><strong>Gender:</strong> {person.gender}</p>
              <p><strong>Birth Date:</strong> {person.birth_date_string}</p>
              <p><strong>Birth Place:</strong> {person.birth_place}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Clan:</strong> {person.clan}</p>
              <p><strong>Tribe:</strong> {person.tribe}</p>
              <p><strong>Living:</strong> {person.is_living ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <div className="mt-3">
            <h5>Biography</h5>
            <p>{person.biography || 'No biography available.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonDetail;
